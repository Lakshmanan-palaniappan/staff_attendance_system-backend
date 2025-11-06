import sql from "mssql";
import { runQuery } from "../db.js";
import { io } from "../server.js";

// Get pending login requests
export async function listPendingRequests(req, res) {
  try {
    const result = await runQuery(`
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
    res.json(result);
  } catch (err) {
    console.error("Error fetching pending requests:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Approve login request
export async function approveRequest(req, res) {
  try {
    const { requestId, staffId } = req.body;
    if (!requestId || !staffId)
      return res.status(400).json({ error: "Missing requestId or staffId" });

    await runQuery(
      `UPDATE LoginRequests 
       SET Status = 'Approved', ApprovedAt = GETDATE() 
       WHERE RequestId = @requestId`,
      { requestId: { type: sql.Int, value: parseInt(requestId, 10) } }
    );

    io.to(`staff_${staffId}`).emit("login_approved", {
      staffId,
      message: "Your login request has been approved!",
    });

    res.json({ message: "Request approved successfully" });
  } catch (err) {
    console.error("Error approving request:", err);
    res.status(500).json({ error: err.message });
  }
}

// List all staff
export async function listAllStaff(req, res) {
  try {
    const result = await runQuery(`
      SELECT 
        StaffId,
        Name,
        Username,
        IdCardNumber
      FROM Staff
      ORDER BY StaffId DESC
    `);
    res.json(result);
  } catch (err) {
    console.error("Error fetching staff list:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
