import sql from "mssql";
import { runQuery } from "../db.js";

export async function listPendingRequests(req, res) {
  try {
    const r = await runQuery(`
      SELECT lr.RequestId, s.StaffId, s.Name, s.Username, s.IdCardNumber, lr.Status
      FROM LoginRequests lr
      JOIN Staff s ON lr.StaffId = s.StaffId
      WHERE lr.Status = 'Pending'
    `);
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function approveRequest(req, res) {
  try {
    const { requestId, staffId, action = "Approve" } = req.body;

    const status = action === "Reject" ? "Rejected" : "Approved";

    await runQuery(`
      UPDATE LoginRequests
      SET Status=@status, ApprovedAt=GETDATE()
      WHERE RequestId=@id
    `, {
      id: { type: sql.Int, value: +requestId },
      status: { type: sql.VarChar, value: status }
    });

    res.json({ message: `Request ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listAllStaff(req, res) {
  try {
    const r = await runQuery(`
      SELECT StaffId, Name, Username, IdCardNumber, IsAdmin
      FROM Staff
      ORDER BY StaffId DESC
    `);
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
