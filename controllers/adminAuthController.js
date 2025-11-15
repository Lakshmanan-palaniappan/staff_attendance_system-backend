import { AdminModel } from "../models/adminModel.js";
import { hashAdminPassword } from "../utils/adminHashHelper.js";

export async function adminRegister(req, res) {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "Username & password required" });

  try {
    const exists = await AdminModel.findByUsername(username);
    if (exists.length > 0)
      return res.status(400).json({ error: "Admin already exists" });

    const hashed = hashAdminPassword(password);

    await AdminModel.create(username, hashed);

    res.json({ message: "Admin registered successfully" });

  } catch (err) {
    console.error("Admin Register Error:", err);
    res.status(500).json({ error: "Internal error" });
  }
}

export async function adminLogin(req, res) {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "Username & password required" });

  try {
    const rows = await AdminModel.findByUsername(username);
    if (!rows.length)
      return res.status(404).json({ error: "Admin not found" });

    const admin = rows[0];
    const incoming = hashAdminPassword(password);

    if (incoming !== admin.PasswordHash)
      return res.status(401).json({ error: "Invalid password" });

    res.json({
      message: "Admin login successful",
      adminId: admin.AdminID,
      username: admin.Username
    });

  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
}
