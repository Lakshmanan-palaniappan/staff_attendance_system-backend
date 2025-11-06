import { runQuery } from "../db.js";

export const AppConfigModel = {
  async getConfig() {
    const r = await runQuery(`SELECT TOP 1 CollegeLat, CollegeLng, AllowedRadiusMeters FROM AppConfig`);
    return r && r.length ? r[0] : null;
  }
};
