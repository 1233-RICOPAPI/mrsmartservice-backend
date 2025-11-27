// api/db.js
import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

// En producción (Render) usamos DATABASE_URL
// En local seguimos usando DB_HOST, DB_USER, etc.
const isProd = !!process.env.DATABASE_URL;

export const pool = new Pool(
  isProd
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // necesario para muchos Postgres en la nube
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

// Helper para hacer queries (igual que antes)
export async function query(q, params = []) {
  const { rows } = await pool.query(q, params);
  return rows;
}
