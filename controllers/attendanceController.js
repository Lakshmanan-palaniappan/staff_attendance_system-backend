// controllers/attendanceController.js
import sql from "mssql";
import { runQuery } from "../db.js";
import { AttendanceModel } from "../models/attendanceModel.js";
import { AppConfigModel } from "../models/appConfigModel.js";

const CHECKOUT_COOLDOWN_SECONDS = 5 * 60; // 5 minutes

// --------------------------------------------------
// Helpers
// --------------------------------------------------
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

// --------------------------------------------------
// Controllers
// --------------------------------------------------
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

    // Latest record today (authoritative)
    const lastToday = todayRecords.length
      ? todayRecords.reduce((latest, row) => {
          if (!latest) return row;
          return new Date(row.Timestamp) > new Date(latest.Timestamp)
            ? row
            : latest;
        }, null)
      : null;

    /* =========================================================
       CASE 1: NO RECORD TODAY → FIRST CHECK-IN ONLY
    ========================================================= */
    if (!lastToday) {
      const lastAnyRows = await AttendanceModel.getLastByStaff(staffId);
      const lastAny = lastAnyRows.length ? lastAnyRows[0] : null;

      // Previous day left open → validate EmpAttdCheckForApp
      if (lastAny && lastAny.CheckType?.toLowerCase() === "checkin") {
        const lastDate = dateOnly(new Date(lastAny.Timestamp));

        if (lastDate < todayDate) {
          const empStatus = await getEmpStatusForStaff(staffId);

          const pending = [];
          if (!empStatus) pending.push("Employee status not configured");
          else {
            if (!empStatus.attdCompleted)
              pending.push("Attendance not completed");
            if (!empStatus.semPlanCompleted)
              pending.push("Semester plan not completed");
          }

          if (pending.length > 0) {
            return res.status(400).json({
              error:
                "Cannot check in. Previous day's work pending: " +
                pending.join(", "),
              pendingTasks: pending,
              empStatus: empStatus || null,
            });
          }
        }
      }

      // Geofence check for CHECK-IN
      const distance = getDistance(
        lat,
        lng,
        cfg.CollegeLat,
        cfg.CollegeLng
      );
      if (distance > cfg.AllowedRadiusMeters) {
        return res
          .status(400)
          .json({ error: "Cannot check in outside geofence" });
      }

      // ✅ INSERT ONLY IF NOT EXISTS (first check-in preserved)
      const checkinResult = await AttendanceModel.insertCheckinOnce({
  staffId,
  latitude: lat,
  longitude: lng,
});

const alreadyCheckedIn = checkinResult.AlreadyCheckedIn === 1;

const empStatus = await getEmpStatusForStaff(staffId);

return res.json({
  success: true,
  message: alreadyCheckedIn
    ? "You are already checked in for today."
    : "Attendance marked: checkin",
  currentStatus: "checkin",
  alreadyCheckedIn,
  empStatus: empStatus || null,
});

    }

    /* =========================================================
       CASE 2: RECORD EXISTS TODAY
    ========================================================= */
    const lastType = lastToday.CheckType?.toLowerCase();

    /* ---------------- CHECKOUT FLOW ---------------- */
    if (lastType === "checkin") {
      const diffSeconds = Math.max(
        0,
        Number(lastToday.SecondsSinceCheckin || 0)
      );

      const remainingSeconds =
        CHECKOUT_COOLDOWN_SECONDS - diffSeconds;

      if (remainingSeconds > 0) {
        return res.status(429).json({
          error: `Checkout locked. Wait ${Math.floor(
            remainingSeconds / 60
          )} min ${remainingSeconds % 60} sec.`,
          cooldown: {
            totalSeconds: CHECKOUT_COOLDOWN_SECONDS,
            secondsRemaining: remainingSeconds,
          },
        });
      }

      // Midnight guard
      if (dateOnly(new Date(lastToday.Timestamp)) < todayDate) {
        return res.status(400).json({
          error:
            "Checkout window for that day is closed. Please contact admin.",
        });
      }

      const empStatus = await getEmpStatusForStaff(staffId);
      if (!empStatus) {
        return res.status(400).json({
          error:
            "Cannot checkout. Employee status not configured.",
        });
      }

      const pending = [];
      if (!empStatus.attdCompleted)
        pending.push("Attendance not completed");
      if (!empStatus.semPlanCompleted)
        pending.push("Semester plan not completed");

      if (pending.length > 0) {
        return res.status(400).json({
          error: `Cannot checkout, pending: ${pending.join(" & ")}.`,
          pendingTasks: pending,
          empStatus,
        });
      }

      // Geofence check for CHECKOUT
      const distanceCheckout = getDistance(
        lat,
        lng,
        cfg.CollegeLat,
        cfg.CollegeLng
      );
      if (distanceCheckout > cfg.AllowedRadiusMeters) {
        return res
          .status(400)
          .json({ error: "Cannot checkout outside geofence" });
      }

      // ✅ UPDATE LAST CHECKOUT OR INSERT IF NONE
      await AttendanceModel.upsertCheckout({
        staffId,
        latitude: lat,
        longitude: lng,
      });

      return res.json({
        success: true,
        message: "Attendance marked: checkout",
        currentStatus: "checkout",
        empStatus,
      });
    }

    /* ---------------- ALREADY CHECKED OUT ---------------- */
    if (lastType === "checkout") {
  const empStatus = await getEmpStatusForStaff(staffId);

  return res.json({
    success: true,
    alreadyCheckedIn: true,
    message: "Attendance already completed for today.",
    currentStatus: "checkout",
    empStatus: empStatus || null,
  });
}


    return res.status(400).json({
      error: "Invalid attendance state",
    });
  } catch (err) {
    console.error("markAttendance error:", err);
    return res.status(500).json({ error: err.message });
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

/*export async function markAttendance(req, res) {
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

      // If last record (any day) was CHECKIN and it belongs to a previous day,
      // ensure previous day's work (EmpAttdCheckForApp) is completed.
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
  // ✅ Use SQL-calculated elapsed time (authoritative)
  const diffSeconds = Math.max(
    0,
    Number(lastToday.SecondsSinceCheckin || 0)
  );

  const remainingSeconds = Math.max(
    0,
    CHECKOUT_COOLDOWN_SECONDS - diffSeconds
  );

  const minutesLeft = Math.floor(remainingSeconds / 60);
  const secondsLeft = remainingSeconds % 60;

  // ⛔ Cooldown active
  if (remainingSeconds > 0) {
    console.log(
      `[CHECKOUT COOLDOWN] Staff ${staffId} | Remaining: ${minutesLeft} min ${secondsLeft} sec`
    );

    return res.status(429).json({
      error: `Checkout locked. Wait ${minutesLeft} min ${secondsLeft} sec.`,
      cooldown: {
        totalSeconds: CHECKOUT_COOLDOWN_SECONDS,
        secondsRemaining: remainingSeconds,
        minutesRemaining: minutesLeft,
      },
      message:
        `Please wait ${minutesLeft} min ${secondsLeft} sec before checking out.`,
    });
  }

  // ❌ checkout cannot be done after midnight
  const checkinDate = dateOnly(new Date(lastToday.Timestamp));
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

  // ✅ Checkout must be inside geofence
  const distanceCheckout = getDistance(
    lat,
    lng,
    cfg.CollegeLat,
    cfg.CollegeLng
  );
  if (distanceCheckout > cfg.AllowedRadiusMeters) {
    return res
      .status(400)
      .json({ error: "Cannot checkout outside geofence" });
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



    // ------------------------ ALREADY CHECKED OUT TODAY ----------------------
    if (lastType === "checkout") {
      // Once checked out for this day, no further check-ins allowed today.
      const empStatus = await getEmpStatusForStaff(staffId);

      return res.status(400).json({
        error:
          "You have already checked out for today. Further check-ins are not allowed.",
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
}*/



