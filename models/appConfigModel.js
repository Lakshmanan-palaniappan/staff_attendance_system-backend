// models/appConfigModel.js
import sql from "mssql";
import { runQuery } from "../db.js";

export const AppConfigModel = {
  async getConfig() {
    const rows = await runQuery(`
      SELECT TOP 1 
        ConfigID,
        CollegeLat,
        CollegeLng,
        AllowedRadiusMeters
      FROM AppConfig
      ORDER BY ConfigID;
    `);
    return rows[0] || null;
  },

  async updateAllowedRadius(allowedRadiusMeters) {
    return await runQuery(
      `
      UPDATE AppConfig
      SET AllowedRadiusMeters = @r
      WHERE ConfigID = 1;
      `,
      {
        r: { type: sql.Int, value: Number(allowedRadiusMeters) }
      }
    );
  }
};
