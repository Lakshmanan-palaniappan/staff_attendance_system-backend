// models/attendanceModel.js
import sql from "mssql";
import { runQuery } from "../db.js";

export const AttendanceModel = {
  // ---------- INSERT ----------
  async markAttendance({ staffId, checkType, latitude, longitude }) {
    return await runQuery(
      `
      INSERT INTO Attendance (StaffId, CheckType, Latitude, Longitude)
      VALUES (@staffId, @checkType, @latitude, @longitude)
      `,
      {
        staffId: { type: sql.Int, value: parseInt(staffId) },
        checkType: { type: sql.NVarChar, value: checkType },
        latitude: { type: sql.Float, value: latitude },
        longitude: { type: sql.Float, value: longitude }
      }
    );
  },

  // ---------- TODAY ONLY ----------
  async getTodayByStaff(staffId) {
    return await runQuery(
      `
      SELECT *,
  DATEDIFF(SECOND, [Timestamp], GETDATE()) AS SecondsSinceCheckin
FROM Attendance
WHERE StaffId = @id
  AND CONVERT(date, [Timestamp]) = CONVERT(date, GETDATE())
ORDER BY [Timestamp] DESC

      `,
      { id: { type: sql.Int, value: parseInt(staffId) } }
    );
  },

  // ---------- ALL RECORDS ----------
  async getAllByStaff(staffId) {
    return await runQuery(
      `
      SELECT *
      FROM Attendance
      WHERE StaffId = @id
      ORDER BY Timestamp DESC
      `,
      { id: { type: sql.Int, value: parseInt(staffId) } }
    );
  },

  // ---------- LAST RECORD (ANY DAY) ----------
  // Used by markAttendance to see if there is an open check-in from a previous day
  async getLastByStaff(staffId) {
    return await runQuery(
      `
      SELECT TOP 1 *
      FROM Attendance
      WHERE StaffId = @id
      ORDER BY Timestamp DESC
      `,
      { id: { type: sql.Int, value: parseInt(staffId) } }
    );
  },

  // ---------- CHECK-IN / CHECK-OUT PAIRS ----------
  async getCheckinCheckoutPairs(staffId) {
    return await runQuery(
      `
      WITH CTE AS (
        SELECT 
          AttendanceId,
          StaffId,
          CheckType,
          Timestamp,
          CONVERT(date, Timestamp) AS DateOnly,
          ROW_NUMBER() OVER (
            PARTITION BY StaffId, CONVERT(date, Timestamp), CheckType
            ORDER BY Timestamp
          ) AS RN
        FROM Attendance
        WHERE StaffId = @id
      )
      SELECT
        CONVERT(varchar(10), ci.DateOnly, 120) AS Date,
        ci.Timestamp AS CheckInTime,
        co.Timestamp AS CheckOutTime
      FROM CTE ci
      LEFT JOIN CTE co
        ON ci.StaffId = co.StaffId
       AND ci.DateOnly = co.DateOnly
       AND ci.RN = co.RN
       AND co.CheckType = 'checkout'
      WHERE ci.CheckType = 'checkin'
      ORDER BY ci.DateOnly DESC, ci.Timestamp ASC
      `,
      { id: { type: sql.Int, value: parseInt(staffId) } }
    );
  },

  // models/attendanceModel.js

async insertCheckinOnce({ staffId, latitude, longitude }) {
  const result = await runQuery(
    `
    IF EXISTS (
      SELECT 1 FROM Attendance
      WHERE StaffId = @staffId
        AND CheckType = 'checkin'
        AND CONVERT(date, Timestamp) = CONVERT(date, GETDATE())
    )
    BEGIN
      SELECT 1 AS AlreadyCheckedIn;
      RETURN;
    END

    INSERT INTO Attendance (StaffId, CheckType, Latitude, Longitude)
    VALUES (@staffId, 'checkin', @lat, @lng);

    SELECT 0 AS AlreadyCheckedIn;
    `,
    {
      staffId: { type: sql.Int, value: staffId },
      lat: { type: sql.Float, value: latitude },
      lng: { type: sql.Float, value: longitude },
    }
  );

  return result?.[0] ?? { AlreadyCheckedIn: 0 };
},

async upsertCheckout({ staffId, latitude, longitude }) {
  return runQuery(
    `
    UPDATE Attendance
    SET Timestamp = GETDATE(),
        Latitude = @lat,
        Longitude = @lng
    WHERE AttendanceId = (
      SELECT TOP 1 AttendanceId
      FROM Attendance
      WHERE StaffId = @staffId
        AND CheckType = 'checkout'
        AND CONVERT(date, Timestamp) = CONVERT(date, GETDATE())
      ORDER BY Timestamp DESC
    );

    IF @@ROWCOUNT = 0
    BEGIN
      INSERT INTO Attendance (StaffId, CheckType, Latitude, Longitude)
      VALUES (@staffId, 'checkout', @lat, @lng)
    END
    `,
    {
      staffId: { type: sql.Int, value: staffId },
      lat: { type: sql.Float, value: latitude },
      lng: { type: sql.Float, value: longitude }
    }
  );
}


};
