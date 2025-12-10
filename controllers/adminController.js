// controllers/adminController.js
import { LoginRequestModel } from "../models/loginRequestModel.js";
import { AttendanceModel } from "../models/attendanceModel.js";
import { AdminModel } from "../models/adminModel.js";
import { UserLoginModel } from "../models/userLoginModel.js";
import sql from "mssql";
import { runQuery } from "../db.js";
import { AppVersionModel } from "../models/appVersionModel.js";

export async function listPendingRequests(req, res) {
  try {
    const data = await LoginRequestModel.getPending();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function approveRequest(req, res) {
  try {
    const { requestId, action = "Approve" } = req.body;
    const status = action === "Reject" ? "Rejected" : "Approved";

    await LoginRequestModel.approve(requestId, status);

    res.json({ message: `Request ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listAllStaff(req, res) {
  try {
    const rows = await runQuery(`
      SELECT 
        u.ContID AS StaffId,
        ea.EmpName AS StaffName,
        ea.Department AS Department,       -- 👈 department from EmpAttdCheckForApp
        u.EmpUName AS Username,
        u.AppVersion,
        (SELECT TOP 1 Timestamp 
         FROM Attendance 
         WHERE StaffId = u.ContID AND CheckType = 'checkin' 
         ORDER BY Timestamp DESC) AS LastCheckIn,
        (SELECT TOP 1 Timestamp 
         FROM Attendance 
         WHERE StaffId = u.ContID AND CheckType = 'checkout' 
         ORDER BY Timestamp DESC) AS LastCheckOut
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
      ORDER BY u.ContID DESC;
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


// 2. Admin: Get Full Attendance of a Staff
export async function getStaffAttendance(req, res) {
  const { staffId } = req.params;

  try {
    const rows = await AttendanceModel.getAllByStaff(staffId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 3. Admin: Today Attendance For All Staff
export async function getTodayAttendanceForAll(req, res) {
  try {
    const rows = await AdminModel.getTodayForAll();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 4. Admin: Check-in/Check-out pairs
export async function getCheckinCheckoutPairs(req, res) {
  const { staffId } = req.params;

  try {
    const rows = await AdminModel.getCheckinCheckoutPairs(staffId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getTodayAttendanceStaffWise(req, res) {
  try {
    const rows = await AdminModel.getTodayStaffWise();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createAppVersion(req, res) {
  try {
    const { versionNo } = req.body;

    if (!versionNo || !String(versionNo).trim()) {
      return res.status(400).json({ error: "versionNo is required" });
    }

    const cleanVersion = String(versionNo).trim();

    await AppVersionModel.createNew(cleanVersion);

    const latest = await AppVersionModel.getLatest();

    res.json({
      message: "App version updated",
      latestVersion: latest?.version ?? cleanVersion
    });
  } catch (err) {
    console.error("createAppVersion error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAppConfig(req, res) {
  try {
    const config = await AppConfigModel.getConfig();
    if (!config) {
      return res.status(404).json({ error: "AppConfig row not found" });
    }
    res.json(config);
  } catch (err) {
    console.error("getAppConfig error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateAllowedRadius(req, res) {
  try {
    const { allowedRadiusMeters } = req.body;

    if (
      allowedRadiusMeters === undefined ||
      allowedRadiusMeters === null ||
      isNaN(Number(allowedRadiusMeters))
    ) {
      return res
        .status(400)
        .json({ error: "allowedRadiusMeters (number) is required" });
    }

    const radius = Number(allowedRadiusMeters);
    if (radius <= 0) {
      return res
        .status(400)
        .json({ error: "allowedRadiusMeters must be positive" });
    }

    await AppConfigModel.updateAllowedRadius(radius);

    res.json({
      message: "Allowed radius updated",
      allowedRadiusMeters: radius
    });
  } catch (err) {
    console.error("updateAllowedRadius error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

