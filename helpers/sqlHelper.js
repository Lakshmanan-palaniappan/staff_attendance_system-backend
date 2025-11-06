import { runQuery } from "../db.js";

export async function executeQuery(query, params = {}) {
  try {
    const result = await runQuery(query, params);
    return result || [];
  } catch (err) {
    console.error("SQL Execution Error:", err);
    throw err;
  }
}
