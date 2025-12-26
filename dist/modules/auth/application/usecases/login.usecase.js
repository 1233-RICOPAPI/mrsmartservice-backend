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
import jwt from 'jsonwebtoken';
import { Inject, Injectable } from '@nestjs/common';
import { AUTH_REPOSITORY } from '../../domain/auth-repository.port.js';
let LoginUseCase = class LoginUseCase {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async execute(email, password) {
        if (!email || !password)
            return { error: 'missing_credentials' };
        const user = await this.repo.findByEmail(email);
        if (!user)
            return { error: 'invalid_credentials' };
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok)
            return { error: 'invalid_credentials' };
        if (!process.env.JWT_SECRET)
            return { error: 'server_config_error' };
        const payload = { sub: user.userId, user_id: user.userId, email: user.email, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
        return { token, role: user.role, email: user.email };
    }
};
LoginUseCase = __decorate([
    Injectable(),
    __param(0, Inject(AUTH_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], LoginUseCase);
export { LoginUseCase };
//# sourceMappingURL=login.usecase.js.map