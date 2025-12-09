// models/appVersionModel.js
import sql from "mssql";
import { runQuery } from "../db.js";

export const AppVersionModel = {
  // Used by loginRequest
  async getLatest() {
    const rows = await runQuery(`
      SELECT TOP 1 Id, VersionNo
      FROM AppVersion
      WHERE IsLatest = 1
      ORDER BY Id DESC
    `);

    if (!rows.length) return null;

    return {
      id: rows[0].Id,
      version: rows[0].VersionNo
    };
  },

  // Used by admin to add a new release
  async createNew(versionNo) {
    // 1️⃣ Mark all existing as not latest
    await runQuery(`UPDATE AppVersion SET IsLatest = 0`);

    // 2️⃣ Insert new version as latest
    await runQuery(
      `
      INSERT INTO AppVersion (VersionNo, ReleaseDate, IsLatest)
      VALUES (@v, GETDATE(), 1)
      `,
      {
        v: { type: sql.NVarChar, value: versionNo }
      }
    );
  }
};
