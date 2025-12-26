var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { UsersRepository } from './users.repository.js';
let UsersService = class UsersService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async listPanelUsers() {
        const users = await this.repo.listPanelUsers();
        return users.map((u) => ({ user_id: u.userId, email: u.email, role: u.role, created_at: u.createdAt }));
    }
    async createPanelUser(body) {
        const { email, password } = body || {};
        if (!email || !password)
            throw new BadRequestException('missing_fields');
        const normalizedEmail = String(email).trim().toLowerCase();
        if (String(password).length < 8)
            throw new BadRequestException('weak_password');
        const currentCount = await this.repo.countPanelUsers();
        if (currentCount >= 3)
            throw new BadRequestException('user_limit_reached');
        const exists = await this.repo.existsByEmail(normalizedEmail);
        if (exists)
            throw new BadRequestException('email_in_use');
        const password_hash = await bcrypt.hash(String(password), 10);
        const u = await this.repo.createUser(normalizedEmail, password_hash);
        return { user_id: u.userId, email: u.email, role: u.role, created_at: u.createdAt };
    }
    async deletePanelUser(id, meId) {
        if (!Number.isFinite(id))
            throw new BadRequestException('invalid_id');
        if (meId && meId === id)
            throw new BadRequestException('cannot_delete_self');
        const u = await this.repo.getById(id);
        if (!u)
            throw new NotFoundException('user_not_found');
        const email = String(u.email || '').toLowerCase();
        const role = String(u.role || '').toUpperCase();
        if (email === 'admin@tienda.com' || email === 'dev@tienda.com' || role === 'ADMIN' || role === 'DEV_ADMIN') {
            throw new ForbiddenException('cannot_delete_seed');
        }
        await this.repo.deleteById(id);
        return { ok: true };
    }
};
UsersService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [UsersRepository])
], UsersService);
export { UsersService };
//# sourceMappingURL=users.service.js.map