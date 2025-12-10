// controllers/staffController.js
import { UserLoginModel } from "../models/userLoginModel.js";
import { AttendanceModel } from "../models/attendanceModel.js";

/**
 * GET /staff/me/:staffId
 * Fetch basic staff profile
 */
export async function getMyProfile(req, res) {
  const { staffId } = req.params;

  try {
    const rows = await UserLoginModel.getByContId(staffId);
    if (!rows.length) return res.status(404).json({ error: "User not found" });

    const user = rows[0];

    res.json({
      staffId: user.ContID,
      username: user.EmpUName,
      name: user.StaffName || user.EmpUName,       // real name if available
      serverAppVersion: user.AppVersion || null,    // ⬅️ NEW FIELD
      Department: user.Dept
    });

  } catch (err) {
    console.error("Profile Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}


/**
 * GET /staff/attendance/today/:staffId
 */
export async function getMyAttendanceToday(req, res) {
  const { staffId } = req.params;

  try {
    const rows = await AttendanceModel.getTodayByStaff(staffId);
    res.json(rows);
  } catch (err) {
    console.error("Attendance Today Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /staff/attendance/all/:staffId
 */
export async function getMyAttendanceAll(req, res) {
  const { staffId } = req.params;

  try {
    const rows = await AttendanceModel.getAllByStaff(staffId);
    res.json(rows);
  } catch (err) {
    console.error("Attendance All Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /staff/attendance/pairs/:staffId
 * Returns [{ date, checkInTime, checkOutTime }]
 */
export async function getMyAttendancePairs(req, res) {
  const { staffId } = req.params;

  try {
    const rows = await AttendanceModel.getCheckinCheckoutPairs(staffId);
    res.json(rows);
  } catch (err) {
    console.error("Attendance Pairs Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
