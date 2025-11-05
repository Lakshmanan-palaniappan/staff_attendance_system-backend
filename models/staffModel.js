import sql from "mssql";
import { runQuery } from "../db.js";

export const StaffModel = {
  async findByUsernameOrIdCard(usernameOrId) {
    const normalizedInput = usernameOrId.trim().toLowerCase();

    const query = `
      SELECT * FROM Staff
      WHERE LOWER(LTRIM(RTRIM(Username))) = @usernameOrId
         OR LOWER(LTRIM(RTRIM(IdCardNumber))) = @usernameOrId
    `;

    return await runQuery(query, {
      usernameOrId: { type: sql.NVarChar, value: normalizedInput },
    });
  },

  async findByUsernameOrIdCardExists(username, idCardNumber) {
    const query = `
      SELECT * FROM Staff
      WHERE LOWER(LTRIM(RTRIM(Username))) = @username
         OR LOWER(LTRIM(RTRIM(IdCardNumber))) = @idCardNumber
    `;

    return await runQuery(query, {
      username: { type: sql.NVarChar, value: username.trim().toLowerCase() },
      idCardNumber: { type: sql.NVarChar, value: idCardNumber.trim().toLowerCase() },
    });
  },

  async create({ name, username, passwordHash, idCardNumber }) {
    const query = `
      INSERT INTO Staff (Name, Username, PasswordHash, IdCardNumber)
      VALUES (@name, @username, @passwordHash, @idCardNumber)
    `;
    return await runQuery(query, {
      name: { type: sql.NVarChar, value: name.trim() },
      username: { type: sql.NVarChar, value: username.trim() },
      passwordHash: { type: sql.NVarChar, value: passwordHash },
      idCardNumber: { type: sql.NVarChar, value: idCardNumber.trim() },
    });
  },
};
