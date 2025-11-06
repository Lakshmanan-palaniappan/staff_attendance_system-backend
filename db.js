import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

export const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to MSSQL');
    return pool;
  })
  .catch(err => {
    console.error('DB Connection Failed', err);
    throw err;
  });

export async function runQuery(queryText, params = {}) {
  const pool = await poolPromise;
  const request = pool.request();
  for (const key in params) {
    const p = params[key];
    if (p && typeof p === 'object' && 'type' in p && 'value' in p) {
      request.input(key, p.type, p.value);
    } else {
      request.input(key, p);
    }
  }
  const result = await request.query(queryText);
  return result.recordset;
}
