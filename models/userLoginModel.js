// models/userLoginModel.js
import sql from "mssql";
import { runQuery } from "../db.js";

export const UserLoginModel = {
  async findByEmpUName(username) {
    return await runQuery(
      `
      SELECT 
        u.ContID,
        u.EmpUName,
        u.EmpPwd,
        u.AppVersion,
        ISNULL(u.DeviceCount, 0) AS DeviceCount,
        u.LastDeviceLoginAt,
        ea.EmpName AS StaffName,
        ea.Department AS Dept
      FROM UserLogin u
      OUTER APPLY (
        SELECT TRY_CONVERT(
          INT,
          REVERSE(
            SUBSTRING(
              REVERSE(u.EmpUName),
              1,
              PATINDEX('%[^0-9]%', REVERSE(u.EmpUName) + 'X') - 1
            )
          )
        ) AS EmpIdFromUserName
      ) x
      LEFT JOIN EmpAttdCheckForApp ea
        ON ea.EmpId = x.EmpIdFromUserName
      WHERE 
        LOWER(REPLACE(LTRIM(RTRIM(u.EmpUName)), ' ', '')) =
        LOWER(REPLACE(@username, ' ', ''))
      `,
      { username: { type: sql.VarChar, value: username.trim() } }
    );
  },

  async incrementDeviceCount(contId) {
    return await runQuery(
      `
      UPDATE UserLogin
      SET 
        DeviceCount = ISNULL(DeviceCount, 0) + 1,
        LastDeviceLoginAt = GETDATE()
      WHERE ContID = @id
      `,
      { id: { type: sql.BigInt, value: Number(contId) } }
    );
  },

  async resetDeviceCount(contId) {
    return await runQuery(
      `
      UPDATE UserLogin
      SET DeviceCount = 0
      WHERE ContID = @id
      `,
      { id: { type: sql.BigInt, value: Number(contId) } }
    );
  },

  async getByContId(contId) {
    return await runQuery(
      `
      SELECT 
        u.ContID,
        u.EmpUName,
        u.EmpPwd,
        u.AppVersion,            -- ⬅️ add this
        ea.EmpName AS StaffName,
        ea.Department as Dept
      FROM UserLogin u
      OUTER APPLY (
        SELECT TRY_CONVERT(
                 INT,
                 REVERSE(
                   SUBSTRING(
                     REVERSE(u.EmpUName),
                     1,
                     PATINDEX('%[^0-9]%', REVERSE(u.EmpUName) + 'X') - 1
                   )
                 )
               ) AS EmpIdFromUserName
      ) x
      LEFT JOIN EmpAttdCheckForApp ea
        ON ea.EmpId = x.EmpIdFromUserName
      WHERE u.ContID = @id
      `,
      { id: { type: sql.BigInt, value: Number(contId) } }
    );
  },

  // store staff's app version
  async updateAppVersion(contId, appVersion) {
    return await runQuery(
      `
      UPDATE UserLogin
      SET AppVersion = @appVersion,
          AppVersionUpdatedAt = GETDATE()
      WHERE ContID = @id
      `,
      {
        appVersion: { type: sql.NVarChar, value: appVersion },
        id: { type: sql.BigInt, value: Number(contId) }
      }
    );
  }
};
