// controllers/appController.js
import { AppVersionModel } from "../models/appVersionModel.js";

export async function getLatestVersion(req, res) {
  try {
    const latest = await AppVersionModel.getLatest();
    if (!latest) {
      return res.status(404).json({ error: "No latest version configured" });
    }

    res.json({ latestVersion: latest.version });
  } catch (err) {
    console.error("getLatestVersion error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
