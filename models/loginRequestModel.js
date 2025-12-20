// models/loginRequestModel.js
import sql from "mssql";
import { runQuery } from "../db.js";

export const LoginRequestModel = {
  async create(staffId) {
    return await runQuery(
      `
      INSERT INTO LoginRequests (StaffId, Status, RequestedAt)
      VALUES (@id, 'Pending', GETDATE())
      `,
      { id: { type: sql.Int, value: staffId } }
    );
  },

  async findByStaff(staffId) {
    return await runQuery(
      `
      SELECT * FROM LoginRequests
      WHERE StaffId=@id AND Status='Pending'
      `,
      { id: { type: sql.Int, value: staffId } }
    );
  },

  async getPending() {
    return await runQuery(`
      SELECT 
        lr.RequestId,
        lr.StaffId AS ContID,
        u.EmpUName,
        ea.EmpName AS StaffName,
        lr.Status,
        lr.RequestedAt
      FROM LoginRequests lr
      JOIN UserLogin u ON lr.StaffId = u.ContID
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
      WHERE lr.Status='Pending'
      ORDER BY lr.RequestedAt DESC
    `);
  },

  async approve(requestId, status) {
    const rows = await runQuery(
      `SELECT StaffId FROM LoginRequests WHERE RequestId=@id`,
      { id: { type: sql.Int, value: requestId } }
    );

    if (!rows.length) return;

    const staffId = rows[0].StaffId;

    await runQuery(
      `
      UPDATE LoginRequests
      SET Status=@s, ApprovedAt=GETDATE()
      WHERE RequestId=@id
      `,
      {
        id: { type: sql.Int, value: requestId },
        s: { type: sql.VarChar, value: status }
      }
    );

    // ✅ Increment device count ONLY when approved
    if (status === "Approved") {
      await UserLoginModel.incrementDeviceCount(staffId);
    }
  }
};
