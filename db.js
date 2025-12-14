// api/db.js
import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

/**
 * Soportamos 3 modos:
 * 1) DATABASE_URL (compat Render / otras nubes)
 * 2) Cloud SQL (Postgres) en Cloud Run usando socket unix: /cloudsql/INSTANCE_CONNECTION_NAME
 *    - Requiere env INSTANCE_CONNECTION_NAME + DB_USER/DB_PASS/DB_NAME
 * 3) Local (DB_HOST, DB_USER, etc.)
 */

const hasDatabaseUrl = !!process.env.DATABASE_URL;
const hasCloudSqlSocket = !!process.env.INSTANCE_CONNECTION_NAME;

export const pool = new Pool(
  hasDatabaseUrl
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : hasCloudSqlSocket
    ? {
        host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: 5432,
        max: 10,
        idleTimeoutMillis: 30000,
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        max: 10,
        idleTimeoutMillis: 30000,
      }
);

// Helper para hacer queries
export async function query(q, params = []) {
  const { rows } = await pool.query(q, params);
  return rows;
}
