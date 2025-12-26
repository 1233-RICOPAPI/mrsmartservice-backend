var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import bcrypt from 'bcryptjs';
import { Inject, Injectable } from '@nestjs/common';
import { AUTH_REPOSITORY } from '../../domain/auth-repository.port.js';
let ChangePasswordUseCase = class ChangePasswordUseCase {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async execute(userId, oldPassword, newPassword) {
        if (!oldPassword || !newPassword)
            return { error: 'missing_fields' };
        if (newPassword.length < 8)
            return { error: 'weak_password' };
        const u = await this.repo.getUserAuth(userId);
        if (!u)
            return { error: 'user_not_found' };
        const ok = await bcrypt.compare(oldPassword, u.passwordHash);
        if (!ok)
            return { error: 'invalid_password' };
        const newHash = await bcrypt.hash(newPassword, 10);
        await this.repo.updateUserPassword(userId, newHash);
        return { success: true };
    }
};
ChangePasswordUseCase = __decorate([
    Injectable(),
    __param(0, Inject(AUTH_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], ChangePasswordUseCase);
export { ChangePasswordUseCase };
//# sourceMappingURL=change-password.usecase.js.map