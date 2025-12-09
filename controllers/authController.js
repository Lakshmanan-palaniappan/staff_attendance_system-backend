// controllers/authController.js
import sql from "mssql";
import { runQuery } from "../db.js";
import { UserLoginModel } from "../models/userLoginModel.js";
import { LoginRequestModel } from "../models/loginRequestModel.js";
import { AppVersionModel } from "../models/appVersionModel.js";
import { generateEmpPwdHash } from "../utils/hashHelper.js";

export async function loginRequest(req, res) {
  const { usernameOrId, password, appVersion } = req.body;

  if (!usernameOrId || !password) {
    return res
      .status(400)
      .json({ error: "Username & password are required" });
  }

  if (!appVersion || !String(appVersion).trim()) {
    return res.status(400).json({ error: "App version is required" });
  }

  const clientVersion = String(appVersion).trim();

  try {
    // 1️⃣ Enforce app version
    const latest = await AppVersionModel.getLatest();
    if (!latest) {
      return res
        .status(500)
        .json({ error: "Latest app version is not configured" });
    }

    const latestVersion = String(latest.version).trim();

    if (clientVersion !== latestVersion) {
      // 426 = Upgrade Required
      return res.status(426).json({
        error: "Outdated app version",
        errorCode: "OUTDATED_APP",
        latestVersion,
        message: `Please update your app to version ${latestVersion} to continue.`
      });
    }

    // 2️⃣ Existing login logic
    const rows = await UserLoginModel.findByEmpUName(usernameOrId);
    if (!rows.length) return res.status(404).json({ error: "User not found" });

    const user = rows[0];
    const computed = generateEmpPwdHash(user.ContID, password);

    if (computed !== user.EmpPwd.trim()) {
      return res
        .status(401)
        .json({ error: "Invalid username or password" });
    }

    // 3️⃣ Save staff's app version
    await UserLoginModel.updateAppVersion(user.ContID, clientVersion);

    // 4️⃣ Login request flow
    const pending = await LoginRequestModel.findByStaff(user.ContID);

    if (pending.length > 0) {
      return res.json({
        message: "Waiting for admin approval",
        staffId: user.ContID
      });
    }

    await LoginRequestModel.create(user.ContID);

    return res.json({
      message: "Login request sent",
      staffId: user.ContID
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function checkLoginStatus(req, res) {
  const { staffId } = req.params;

  try {
    const rows = await runQuery(
      `
      SELECT TOP 1 Status
      FROM LoginRequests
      WHERE StaffId=@id
      ORDER BY RequestedAt DESC
      `,
      { id: { type: sql.Int, value: staffId } }
    );

    if (!rows.length) return res.json({ status: "None" });

    return res.json({ status: rows[0].Status });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
}
