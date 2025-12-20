import { UserLoginModel } from "../models/userLoginModel.js";

export async function logout(req, res) {
  const { staffId } = req.body;

  if (!staffId) {
    return res.status(400).json({ error: "staffId required" });
  }

  try {
    await UserLoginModel.resetDeviceCount(staffId);
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
