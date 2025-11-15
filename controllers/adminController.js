import { LoginRequestModel } from "../models/loginRequestModel.js";
import { AttendanceModel } from "../models/attendanceModel.js";
import { AdminModel } from "../models/adminModel.js";
import { UserLoginModel } from "../models/userLoginModel.js";
import sql from "mssql";
import { runQuery } from "../db.js";
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
        u.EmpUName,
        (SELECT TOP 1 Timestamp 
         FROM Attendance 
         WHERE StaffId = u.ContID AND CheckType='checkin' 
         ORDER BY Timestamp DESC) AS LastCheckIn,
        (SELECT TOP 1 Timestamp 
         FROM Attendance 
         WHERE StaffId = u.ContID AND CheckType='checkout' 
         ORDER BY Timestamp DESC) AS LastCheckOut
      FROM UserLogin u
      ORDER BY u.ContID DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


// -----------------------------
// 2. Admin: Get Full Attendance of a Staff
// -----------------------------
export async function getStaffAttendance(req, res) {
  const { staffId } = req.params;

  try {
    const rows = await AttendanceModel.getAllByStaff(staffId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// -----------------------------
// 3. Admin: Today Attendance For All Staff
// -----------------------------
export async function getTodayAttendanceForAll(req, res) {
  try {
    const rows = await AttendanceModel.getTodayForAll();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// -----------------------------
// 4. Admin: Check-in/Check-out pairs
// -----------------------------
export async function getCheckinCheckoutPairs(req, res) {
  const { staffId } = req.params;

  try {
    const rows = await AttendanceModel.getCheckinCheckoutPairs(staffId);
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
