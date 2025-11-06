import sql from "mssql";
import { runQuery } from "../db.js";

export const AttendanceModel = {
  async markAttendance({ staffId, checkType, latitude, longitude }) {
    return await runQuery(
      `INSERT INTO Attendance (StaffId, CheckType, Latitude, Longitude)
       VALUES (@staffId, @checkType, @latitude, @longitude)`,
      {
        staffId: { type: sql.Int, value: parseInt(staffId, 10) },
        checkType: { type: sql.NVarChar, value: checkType },
        latitude: { type: sql.Float, value: latitude },
        longitude: { type: sql.Float, value: longitude },
      }
    );
  },

  async getTodayByStaff(staffId) {
    return await runQuery(
      `SELECT * FROM Attendance
       WHERE StaffId = @staffId
       AND CONVERT(date, Timestamp) = CONVERT(date, GETDATE())
       ORDER BY Timestamp DESC`,
      { staffId: { type: sql.Int, value: parseInt(staffId, 10) } }
    );
  },
};
