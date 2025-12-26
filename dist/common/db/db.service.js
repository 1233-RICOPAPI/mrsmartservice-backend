var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from '@nestjs/common';
import { pool } from './db.pool.js';
let DbService = class DbService {
    pool = pool;
    async query(text, params = []) {
        const { rows } = await pool.query(text, params);
        return rows;
    }
    async tx(fn) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const out = await fn(client);
            await client.query('COMMIT');
            return out;
        }
        catch (e) {
            try {
                await client.query('ROLLBACK');
            }
            catch { }
            throw e;
        }
        finally {
            client.release();
        }
    }
};
DbService = __decorate([
    Injectable()
], DbService);
export { DbService };
//# sourceMappingURL=db.service.js.map