import { Injectable } from '@nestjs/common';
import { pool } from './db.pool.js';

@Injectable()
export class DbService {
  public readonly pool = pool;

  async query<T = any>(text: string, params: any[] = []): Promise<T[]> {
    const { rows } = await pool.query(text, params);
    return rows as T[];
  }

  async tx<T>(fn: (client: any) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch {}
      throw e;
    } finally {
      client.release();
    }
  }
}
