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
let ResetPasswordUseCase = class ResetPasswordUseCase {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async execute(token, password) {
        if (!token || !password)
            return { error: 'bad_request' };
        if (password.length < 8)
            return { error: 'weak_password' };
        const row = await this.repo.findPasswordResetByToken(token);
        if (!row)
            return { error: 'invalid_token' };
        const expired = new Date(row.expiresAt) < new Date();
        if (row.used || expired)
            return { error: 'expired_token' };
        const hash = await bcrypt.hash(password, 10);
        await this.repo.updateUserPassword(Number(row.userId), hash);
        await this.repo.markPasswordResetUsed(Number(row.id));
        return { ok: true };
    }
};
ResetPasswordUseCase = __decorate([
    Injectable(),
    __param(0, Inject(AUTH_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], ResetPasswordUseCase);
export { ResetPasswordUseCase };
//# sourceMappingURL=reset-password.usecase.js.map