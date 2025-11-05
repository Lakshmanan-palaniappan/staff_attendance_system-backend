import { executeQuery } from "../helpers/sqlHelper.js";

export const AppConfigModel = {
  async getConfig() {
    const result = await executeQuery(
      `SELECT TOP 1 CollegeLat, CollegeLng, AllowedRadiusMeters FROM AppConfig`
    );
    console.log("AppConfig query result:", result);

    if (!result || result.length === 0) {
      return null; // handle empty
    }
    return result[0];
  },
};
