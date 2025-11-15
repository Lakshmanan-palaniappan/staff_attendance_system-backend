import sql from "mssql";
import { runQuery } from "../db.js";

export const UserLoginModel = {
  async findByEmpUName(username) {
    return await runQuery(
      `
      SELECT ContID, EmpUName, EmpPwd
      FROM UserLogin
      WHERE 
        LOWER(REPLACE(LTRIM(RTRIM(EmpUName)), ' ', '')) =
        LOWER(REPLACE(@username, ' ', ''))
      `,
      { username: { type: sql.VarChar, value: username.trim() } }
    );
  },

  async getByContId(contId) {
    return await runQuery(
      `
      SELECT ContID, EmpUName, EmpPwd 
      FROM UserLogin
      WHERE ContID = @id
      `,
      { id: { type: sql.BigInt, value: Number(contId) } }
    );
  }
};
