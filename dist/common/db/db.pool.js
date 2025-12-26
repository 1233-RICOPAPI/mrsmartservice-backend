// src/common/db/db.pool.ts
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
// Compat con distintos nombres de variables (.env viejos/nuevos)
const envUser = process.env.DB_USER || process.env.DB_USERNAME || process.env.PGUSER;
const envPass = process.env.DB_PASS || process.env.DB_PASSWORD || process.env.PGPASSWORD;
const envName = process.env.DB_NAME || process.env.DB_DATABASE || process.env.PGDATABASE;
const envHost = process.env.DB_HOST || process.env.PGHOST;
const envPort = Number(process.env.DB_PORT || process.env.PGPORT || 5432);
export const pool = new Pool(hasDatabaseUrl
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    }
    : hasCloudSqlSocket
        ? {
            host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
            user: envUser,
            // pg exige string; si viene undefined rompe con "client password must be a string"
            password: envPass ? String(envPass) : undefined,
            database: envName,
            port: 5432,
            max: 10,
            idleTimeoutMillis: 30000,
        }
        : {
            host: envHost,
            port: envPort,
            user: envUser,
            password: envPass ? String(envPass) : undefined,
            database: envName,
            max: 10,
            idleTimeoutMillis: 30000,
        });
//# sourceMappingURL=db.pool.js.map