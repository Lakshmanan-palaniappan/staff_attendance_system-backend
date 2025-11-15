import sql from "mssql";
import { runQuery } from "../db.js";

export const AdminModel = {
  async findByUsername(username) {
    return await runQuery(
      `SELECT AdminID, Username, PasswordHash
       FROM AdminLogin
       WHERE Username = @u`,
      { u: { type: sql.VarChar, value: username.trim() } }
    );
  },

  async create(username, passwordHash) {
    return await runQuery(
      `INSERT INTO AdminLogin (Username, PasswordHash)
       VALUES (@u, @p)`,
      {
        u: { type: sql.VarChar, value: username },
        p: { type: sql.VarChar, value: passwordHash }
      }
    );
  },
  // Get all attendance for a specific staff
async getAllByStaff(staffId) {
  return await runQuery(
    `SELECT * FROM Attendance
     WHERE StaffId=@id
     ORDER BY Timestamp DESC`,
    { id: { type: sql.Int, value: staffId } }
  );
},

// Get today's attendance for ALL staff
// Get today's attendance for ALL staff (FIXED)
async getTodayForAll() {
  return await runQuery(`
    SELECT a.*, u.EmpUName
    FROM Attendance a
    JOIN UserLogin u ON a.StaffId = u.ContID
    WHERE a.Timestamp >= CAST(GETDATE() AS DATE)
      AND a.Timestamp < DATEADD(day, 1, CAST(GETDATE() AS DATE))
    ORDER BY a.Timestamp DESC
  `);
},


// Get check-in / check-out PAIRS for a staff
// Get check-in / check-out pairs + WORK HOURS
async getCheckinCheckoutPairs(staffId) {
  return await runQuery(`
    WITH Data AS (
      SELECT 
        StaffId,
        CheckType,
        Timestamp,
        ROW_NUMBER() OVER (ORDER BY Timestamp) AS rn
      FROM Attendance
      WHERE StaffId=@id
    )
    SELECT 
      CI.Timestamp AS CheckInTime,
      CO.Timestamp AS CheckOutTime,
      CASE 
        WHEN CO.Timestamp IS NULL THEN NULL
        ELSE DATEDIFF(MINUTE, CI.Timestamp, CO.Timestamp)
      END AS WorkMinutes
    FROM Data CI
    LEFT JOIN Data CO
      ON CO.rn = CI.rn + 1 AND CO.CheckType = 'checkout'
    WHERE CI.CheckType = 'checkin'
    ORDER BY CI.Timestamp DESC
  `, {
    id: { type: sql.Int, value: staffId }
  });
},
async getTodayStaffWise() {
  return await runQuery(`
    SELECT 
      u.ContID AS StaffId,
      u.EmpUName,
      a.CheckType,
      a.Timestamp
    FROM Attendance a
    JOIN UserLogin u ON u.ContID = a.StaffId
    WHERE a.Timestamp >= CAST(GETDATE() AS DATE)
      AND a.Timestamp < DATEADD(day, 1, CAST(GETDATE() AS DATE))
    ORDER BY u.ContID, a.Timestamp ASC
  `);
}



  
};

