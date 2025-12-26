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
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Inject, Injectable } from '@nestjs/common';
import { AUTH_REPOSITORY } from '../../domain/auth-repository.port.js';
import { resolveFrontBase } from '../utils/front-base.js';
let RequestPasswordResetUseCase = class RequestPasswordResetUseCase {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async execute(email) {
        if (!email)
            return { error: 'email_required' };
        const user = await this.repo.findByEmail(email);
        if (!user)
            return { ok: true };
        const roleUpper = String(user.role || '').toUpperCase();
        if (!['ADMIN', 'DEV_ADMIN'].includes(roleUpper))
            return { ok: true };
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
        await this.repo.createPasswordReset(Number(user.userId), token, expiresAt);
        const resetUrl = `${resolveFrontBase()}/reset-password.html?token=${token}`;
        const isDev = String(process.env.NODE_ENV || '').toLowerCase() !== 'production';
        const hasSMTP = !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
        if (hasSMTP) {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT || 587),
                secure: false,
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            });
            await transporter.sendMail({
                from: `"MR SmartService" <${process.env.SMTP_USER}>`,
                to: email,
                subject: 'Recupera tu contraseña - MR SmartService',
                html: `<p>Usa este link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
            });
        }
        return { ok: true, resetUrl: isDev ? resetUrl : undefined };
    }
};
RequestPasswordResetUseCase = __decorate([
    Injectable(),
    __param(0, Inject(AUTH_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], RequestPasswordResetUseCase);
export { RequestPasswordResetUseCase };
//# sourceMappingURL=request-password-reset.usecase.js.map