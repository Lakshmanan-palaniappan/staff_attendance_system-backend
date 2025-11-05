import { runQuery } from "../db.js";

export async function executeQuery(query, params = {}) {
  try {
    const result = await runQuery(query, params);
    return result || []; // always return array
  } catch (error) {
    console.error("SQL Execution Error:", error);
    throw error;
  }
}
