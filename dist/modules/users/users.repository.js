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
import { PrismaService } from '../../common/prisma/prisma.service.js';
let UsersRepository = class UsersRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    listPanelUsers() {
        return this.prisma.user.findMany({
            where: { role: 'USER' },
            orderBy: { createdAt: 'desc' },
            select: { userId: true, email: true, role: true, createdAt: true },
        });
    }
    countPanelUsers() {
        return this.prisma.user.count({ where: { role: 'USER' } });
    }
    existsByEmail(email) {
        return this.prisma.user.findUnique({ where: { email }, select: { userId: true } });
    }
    createUser(email, password_hash) {
        return this.prisma.user.create({
            data: { email, passwordHash: password_hash, role: 'USER' },
            select: { userId: true, email: true, role: true, createdAt: true },
        });
    }
    getById(id) {
        return this.prisma.user.findUnique({ where: { userId: id }, select: { userId: true, email: true, role: true } });
    }
    deleteById(id) {
        return this.prisma.user.delete({ where: { userId: id } });
    }
};
UsersRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], UsersRepository);
export { UsersRepository };
//# sourceMappingURL=users.repository.js.map