var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
let BootstrapService = class BootstrapService {
    db;
    constructor(db) {
        this.db = db;
    }
    async onApplicationBootstrap() {
        // Seed admin/dev (no bloqueante)
        this.seedAdminOnce().catch((e) => console.error('❌ Error en seedAdminOnce:', e?.message || e));
    }
    async seedAdminOnce() {
        const adminEmail = 'admin@tienda.com';
        const adminPass = 'Admin12345!';
        const devEmail = 'dev@tienda.com';
        const devPass = 'Dev12345!';
        const adminHash = bcrypt.hashSync(adminPass, 10);
        const devHash = bcrypt.hashSync(devPass, 10);
        await this.db.user.upsert({
            where: { email: adminEmail },
            update: {},
            create: { email: adminEmail, passwordHash: adminHash, role: 'ADMIN' },
        });
        await this.db.user.upsert({
            where: { email: devEmail },
            update: {},
            create: { email: devEmail, passwordHash: devHash, role: 'DEV_ADMIN' },
        });
        console.log('✅ Seed usuarios listo (creados si no existían):');
        console.log('   Admin:', adminEmail);
        console.log('   Dev:  ', devEmail);
    }
};
BootstrapService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], BootstrapService);
export { BootstrapService };
//# sourceMappingURL=bootstrap.service.js.map