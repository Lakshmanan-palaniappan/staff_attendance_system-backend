import bcrypt from "bcrypt";
import sql from "mssql";
import { runQuery } from "../db.js";
import { StaffModel } from "../models/staffModel.js";
import { LoginRequestModel } from "../models/loginRequestModel.js";

// Register staff
export async function registerStaff(req, res) {
  try {
    const { name, username, password, idCardNumber } = req.body;

    const exists = await StaffModel.findByUsernameOrIdCardExists(username, idCardNumber);
    if (exists.length > 0)
      return res.status(400).json({ error: "Username or ID already exists" });

    const hash = await bcrypt.hash(password, 10);
    await StaffModel.create({ name, username, passwordHash: hash, idCardNumber });

    res.json({ message: "Staff registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
}

// Staff requests login approval
export async function loginRequest(req, res) {
  const { usernameOrId, password } = req.body;

  try {
    const list = await StaffModel.findByUsernameOrIdCard(usernameOrId);
    if (!list.length) return res.status(404).json({ error: "User not found" });

    const staff = list[0];
    const valid = await bcrypt.compare(password, staff.PasswordHash);
    if (!valid) return res.status(401).json({ error: "Invalid password" });

    const existing = await LoginRequestModel.findByStaff(staff.StaffId);
    if (existing.length > 0)
      return res.json({ message: "Waiting for admin approval", staffId: staff.StaffId });

    await LoginRequestModel.create(staff.StaffId);
    res.json({ message: "Login request sent", staffId: staff.StaffId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Staff polling status
export async function checkLoginStatus(req, res) {
  const { staffId } = req.params;

  try {
    const rows = await runQuery(`
      SELECT TOP 1 Status
      FROM LoginRequests
      WHERE StaffId = @id
      ORDER BY RequestedAt DESC
    `, {
      id: { type: sql.Int, value: +staffId }
    });

    if (!rows.length) return res.json({ status: "None" });

    res.json({ status: rows[0].Status });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
}

// Staff login AFTER approval
export async function staffLogin(req, res) {
  const { usernameOrId, password } = req.body;

  try {
    const list = await StaffModel.findByUsernameOrIdCard(usernameOrId);
    if (!list.length) return res.status(404).json({ error: "User not found" });

    const staff = list[0];
    const valid = await bcrypt.compare(password, staff.PasswordHash);
    if (!valid) return res.status(401).json({ error: "Invalid password" });

    const status = await runQuery(`
      SELECT TOP 1 Status FROM LoginRequests
      WHERE StaffId=@id ORDER BY RequestedAt DESC
    `, { id: { type: sql.Int, value: staff.StaffId } });

    if (!status.length || status[0].Status !== "Approved")
      return res.status(403).json({ error: "Not approved yet" });

    res.json({
      message: "Login successful",
      staffId: staff.StaffId,
      name: staff.Name,
      username: staff.Username
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
}

// Admin login (simple login)
export async function adminLogin(req, res) {
  const { username, password } = req.body;

  try {
    const list = await StaffModel.findByUsernameOrIdCard(username);
    if (!list.length) return res.status(404).json({ error: "Admin not found" });

    const admin = list[0];
    if (!admin.IsAdmin)
      return res.status(403).json({ error: "Not an admin" });

    const valid = await bcrypt.compare(password, admin.PasswordHash);
    if (!valid) return res.status(401).json({ error: "Invalid password" });

    res.json({
      message: "Admin login successful",
      adminId: admin.StaffId,
      name: admin.Name
    });

  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
}
