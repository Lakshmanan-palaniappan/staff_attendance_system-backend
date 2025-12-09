// controllers/attendanceController.js
import sql from "mssql";
import { runQuery } from "../db.js";
import { AttendanceModel } from "../models/attendanceModel.js";
import { AppConfigModel } from "../models/appConfigModel.js";

// 15-minute cooldown after checkout
const CHECKIN_COOLDOWN_MINUTES = 15;

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function dateOnly(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Read EmpAttdCheckForApp status for this staff (via EmpUName → EmpId)
async function getEmpStatusForStaff(staffId) {
  const rows = await runQuery(
    `
    SELECT TOP 1
      ea.EmpName,
      ea.Department,
      ea.AttdCompleted,
      ea.SemPlanCompleted
    FROM UserLogin u
    OUTER APPLY (
      SELECT TRY_CONVERT(
               INT,
               REVERSE(
                 SUBSTRING(
                   REVERSE(u.EmpUName),
                   1,
                   PATINDEX('%[^0-9]%', REVERSE(u.EmpUName) + 'X') - 1
                 )
               )
             ) AS EmpIdFromUserName
    ) x
    LEFT JOIN EmpAttdCheckForApp ea
      ON ea.EmpId = x.EmpIdFromUserName
    WHERE u.ContID = @id
    `,
    { id: { type: sql.Int, value: parseInt(staffId) } }
  );

  const row = rows[0];
  if (!row) return null;

  return {
    empName: row.EmpName,
    department: row.Department,
    attdCompleted: !!row.AttdCompleted,
    semPlanCompleted: !!row.SemPlanCompleted,
  };
}

// Get minutes since last CHECKOUT using SQL DATEDIFF (DB time)
async function getMinutesSinceLastCheckout(staffId) {
  const rows = await runQuery(
    `
    SELECT TOP 1
      DATEDIFF(MINUTE, Timestamp, GETDATE()) AS DiffMinutes
    FROM Attendance
    WHERE StaffId = @id AND CheckType = 'checkout'
    ORDER BY Timestamp DESC
    `,
    { id: { type: sql.Int, value: parseInt(staffId) } }
  );

  if (!rows.length || rows[0].DiffMinutes == null) {
    return null; // no checkout yet
  }

  return Number(rows[0].DiffMinutes);
}

export async function markAttendance(req, res) {
  const { staffId, lat, lng } = req.body;

  if (!staffId) {
    return res.status(400).json({ error: "staffId is required" });
  }

  try {
    const cfg = await AppConfigModel.getConfig();
    if (!cfg) {
      return res.status(500).json({ error: "AppConfig missing" });
    }

    const now = new Date();
    const todayDate = dateOnly(now);

    const todayRecords = await AttendanceModel.getTodayByStaff(staffId);

    // Pick LATEST row by Timestamp, regardless of SQL ordering
    const lastToday = todayRecords.length
      ? todayRecords.reduce((latest, row) => {
          if (!latest) return row;
          const t1 = new Date(latest.Timestamp);
          const t2 = new Date(row.Timestamp);
          return t2 > t1 ? row : latest;
        }, null)
      : null;

    // =========================================================
    // CASE 1: FIRST PUNCH TODAY  -> CHECK-IN ATTEMPT
    // =========================================================
    if (!lastToday) {
      const lastAnyRows = await AttendanceModel.getLastByStaff(staffId);
      const lastAny = lastAnyRows.length ? lastAnyRows[0] : null;

      if (lastAny && String(lastAny.CheckType).toLowerCase() === "checkin") {
        const lastTs = new Date(lastAny.Timestamp);
        const lastDate = dateOnly(lastTs);

        if (lastDate < todayDate) {
          const empStatus = await getEmpStatusForStaff(staffId);

          const pending = [];
          if (!empStatus) {
            pending.push("Employee status not configured");
          } else {
            if (!empStatus.attdCompleted)
              pending.push("Attendance not completed");
            if (!empStatus.semPlanCompleted)
              pending.push("Semester plan not completed");
          }

          if (pending.length > 0) {
            const msg =
              `Cannot check in. Previous day's work pending: ` +
              pending.join(", ") +
              `. Please complete these and then try again.`;

            return res.status(400).json({
              error: msg,
              pendingTasks: pending,
              empStatus: empStatus || null,
            });
          }
        }
      }

      // Normal CHECK-IN for today – must be inside geofence
      const distance = getDistance(lat, lng, cfg.CollegeLat, cfg.CollegeLng);
      if (distance > cfg.AllowedRadiusMeters) {
        return res
          .status(400)
          .json({ error: "Cannot check in outside geofence" });
      }

      await AttendanceModel.markAttendance({
        staffId,
        checkType: "checkin",
        latitude: lat,
        longitude: lng,
      });

      const empStatus = await getEmpStatusForStaff(staffId);

      return res.json({
        message: "Attendance marked: checkin",
        currentStatus: "checkin",
        empStatus: empStatus || null,
      });
    }

    // =========================================================
    // CASE 2: WE ALREADY HAVE A RECORD TODAY
    // =========================================================
    const lastType = String(lastToday.CheckType || "")
      .trim()
      .toLowerCase();

    // ------------------------ CHECK-OUT (SAME DAY ONLY) ----------------------
    if (lastType === "checkin") {
      const checkinTs = new Date(lastToday.Timestamp);
      const checkinDate = dateOnly(checkinTs);

      // checkout cannot be done after midnight for that check-in
      if (checkinDate < todayDate) {
        return res.status(400).json({
          error:
            "Checkout window for that day is closed. Please contact admin.",
        });
      }

      const empStatus = await getEmpStatusForStaff(staffId);
      if (!empStatus) {
        return res.status(400).json({
          error:
            "Cannot checkout. Employee status is not configured in EmpAttdCheckForApp.",
        });
      }

      const pending = [];
      if (!empStatus.attdCompleted)
        pending.push("Attendance not completed");
      if (!empStatus.semPlanCompleted)
        pending.push("Semester plan not completed");

      if (pending.length > 0) {
        return res.status(400).json({
          error:
            pending.length === 1
              ? `Cannot checkout, pending: ${pending[0]}.`
              : `Cannot checkout, pending: ${pending.join(" & ")}.`,
          pendingTasks: pending,
          empStatus,
        });
      }

      await AttendanceModel.markAttendance({
        staffId,
        checkType: "checkout",
        latitude: lat,
        longitude: lng,
      });

      return res.json({
        message: "Attendance marked: checkout",
        currentStatus: "checkout",
        empStatus,
      });
    }

    // ------------------------ NEXT CHECK-IN (SAME DAY, AFTER CHECKOUT) ----------------------
    if (lastType === "checkout") {
      // Use DB DATEDIFF to avoid JS timezone issues
      let diffMinutes = await getMinutesSinceLastCheckout(staffId);

      if (diffMinutes == null) {
        // no checkout found → treat as cooldown passed
        diffMinutes = CHECKIN_COOLDOWN_MINUTES + 1;
      }

      if (diffMinutes < 0) {
        // DB time in future? just treat as cooldown passed
        diffMinutes = CHECKIN_COOLDOWN_MINUTES + 1;
      }

      if (diffMinutes < CHECKIN_COOLDOWN_MINUTES) {
        const minutesLeft = Math.max(
          1,
          CHECKIN_COOLDOWN_MINUTES - Math.floor(diffMinutes)
        );

        const empStatus = await getEmpStatusForStaff(staffId);

        return res.status(400).json({
          error: `You have recently checked out. You can check in again after ${minutesLeft} minute(s).`,
          cooldownMinutesLeft: minutesLeft,
          empStatus: empStatus || null,
        });
      }

      // cooldown passed -> normal check-in with geofence
      const distance = getDistance(lat, lng, cfg.CollegeLat, cfg.CollegeLng);
      if (distance > cfg.AllowedRadiusMeters) {
        return res
          .status(400)
          .json({ error: "Cannot check in outside geofence" });
      }

      await AttendanceModel.markAttendance({
        staffId,
        checkType: "checkin",
        latitude: lat,
        longitude: lng,
      });

      const empStatus = await getEmpStatusForStaff(staffId);

      return res.json({
        message: "Attendance marked: checkin",
        currentStatus: "checkin",
        empStatus: empStatus || null,
      });
    }

    // Any other state is unexpected
    return res.status(400).json({
      error: "Invalid last state for attendance operation.",
    });
  } catch (err) {
    console.error("markAttendance error:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function getTodayAttendance(req, res) {
  const { staffId } = req.params;

  try {
    const rows = await AttendanceModel.getTodayByStaff(staffId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
}
