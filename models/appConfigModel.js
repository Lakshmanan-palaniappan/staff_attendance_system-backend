import { runQuery } from "../db.js";

export const AppConfigModel = {
  async getConfig() {
    const rows = await runQuery(`
      SELECT TOP 1 CollegeLat, CollegeLng, AllowedRadiusMeters 
      FROM AppConfig
    `);
    return rows.length ? rows[0] : null;
  }
};
