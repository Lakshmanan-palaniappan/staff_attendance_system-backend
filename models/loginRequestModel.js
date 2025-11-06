import sql from "mssql";
import { runQuery } from "../db.js";

export const LoginRequestModel = {
  // Create new login request
  async create(staffId) {
    return await runQuery(
      `INSERT INTO LoginRequests (StaffId, Status, RequestedAt)
       VALUES (@staffId, 'Pending', GETDATE())`,
      { staffId: { type: sql.Int, value: parseInt(staffId, 10) } }
    );
  },

  // Find if pending request already exists for staff
  async findByStaff(staffId) {
    return await runQuery(
      `SELECT * FROM LoginRequests 
       WHERE StaffId = @staffId AND Status = 'Pending'`,
      { staffId: { type: sql.Int, value: parseInt(staffId, 10) } }
    );
  },

  // Update request status to Approved
  async markApproved(requestId) {
    return await runQuery(
      `UPDATE LoginRequests 
       SET Status = 'Approved', ApprovedAt = GETDATE() 
       WHERE RequestId = @requestId`,
      { requestId: { type: sql.Int, value: parseInt(requestId, 10) } }
    );
  },

  // Get all pending requests (for admin)
  async getPendingRequests() {
    return await runQuery(`
      SELECT 
        lr.RequestId,
        s.StaffId,
        s.Name,
        s.Username,
        s.IdCardNumber,
        lr.RequestedAt
      FROM LoginRequests lr
      JOIN Staff s ON lr.StaffId = s.StaffId
      WHERE lr.Status = 'Pending'
      ORDER BY lr.RequestedAt DESC
    `);
  },
};
