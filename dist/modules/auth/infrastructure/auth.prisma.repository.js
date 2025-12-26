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
import { PrismaService } from '../../../common/prisma/prisma.service.js';
let AuthPrismaRepository = class AuthPrismaRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email },
            select: { userId: true, email: true, passwordHash: true, role: true, createdAt: true },
        });
    }
    async getProfile(userId) {
        return this.prisma.user.findUnique({
            where: { userId },
            select: { userId: true, email: true, role: true, createdAt: true },
        });
    }
    async getUserAuth(userId) {
        return this.prisma.user.findUnique({
            where: { userId },
            select: { userId: true, passwordHash: true, role: true },
        });
    }
    async createPasswordReset(userId, token, expiresAt) {
        const created = await this.prisma.passwordReset.create({
            data: { userId, token, expiresAt, used: false },
            select: { id: true },
        });
        return created.id;
    }
    async findPasswordResetByToken(token) {
        return this.prisma.passwordReset.findUnique({
            where: { token },
            select: { id: true, userId: true, expiresAt: true, used: true },
        });
    }
    async markPasswordResetUsed(id) {
        await this.prisma.passwordReset.update({ where: { id }, data: { used: true } });
    }
    async updateUserPassword(userId, passwordHash) {
        await this.prisma.user.update({ where: { userId }, data: { passwordHash } });
    }
};
AuthPrismaRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], AuthPrismaRepository);
export { AuthPrismaRepository };
//# sourceMappingURL=auth.prisma.repository.js.map