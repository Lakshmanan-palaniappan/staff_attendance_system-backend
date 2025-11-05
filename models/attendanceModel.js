import { executeQuery } from "../helpers/sqlHelper.js";

export const AttendanceModel = {
  async markAttendance({ staffId, checkType, latitude, longitude }) {
    await executeQuery(
      `INSERT INTO Attendance (StaffId, CheckType, Latitude, Longitude)
       VALUES (@staffId, @checkType, @latitude, @longitude)`,
      { staffId, checkType, latitude, longitude }
    );
  },

  async getTodayByStaff(staffId) {
    return await executeQuery(
      `SELECT * FROM Attendance
       WHERE StaffId = @staffId
       AND CONVERT(date, Timestamp) = CONVERT(date, GETDATE())
       ORDER BY Timestamp DESC`,
      { staffId }
    );
  },

  
};
