import sql from "mssql";
import { runQuery } from "../db.js";

export const LoginRequestModel = {
  async create(staffId) {
    return await runQuery(
      `INSERT INTO LoginRequests (StaffId, Status, RequestedAt)
       VALUES (@id, 'Pending', GETDATE())`,
      { id: { type: sql.Int, value: staffId } }
    );
  },

  async findByStaff(staffId) {
    return await runQuery(
      `SELECT * FROM LoginRequests
       WHERE StaffId=@id AND Status='Pending'`,
      { id: { type: sql.Int, value: staffId } }
    );
  },

  async getPending() {
    return await runQuery(`
      SELECT 
        lr.RequestId,
        lr.StaffId AS ContID,
        u.EmpUName,
        lr.Status,
        lr.RequestedAt
      FROM LoginRequests lr
      JOIN UserLogin u ON lr.StaffId = u.ContID
      WHERE lr.Status='Pending'
      ORDER BY lr.RequestedAt DESC
    `);
  },

  async approve(requestId, status) {
    return await runQuery(`
      UPDATE LoginRequests
      SET Status=@s, ApprovedAt=GETDATE()
      WHERE RequestId=@id
    `, {
      id: { type: sql.Int, value: requestId },
      s: { type: sql.VarChar, value: status }
    });
  }
};
