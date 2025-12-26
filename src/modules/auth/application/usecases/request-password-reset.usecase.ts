import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Inject, Injectable } from '@nestjs/common';
import { AUTH_REPOSITORY, type AuthRepositoryPort } from '../../domain/auth-repository.port.js';
import { resolveFrontBase } from '../utils/front-base.js';

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(@Inject(AUTH_REPOSITORY) private readonly repo: AuthRepositoryPort) {}

  async execute(email: string) {
    if (!email) return { error: 'email_required' };

    const user = await this.repo.findByEmail(email);
    if (!user) return { ok: true };

    const roleUpper = String(user.role || '').toUpperCase();
    if (!['ADMIN', 'DEV_ADMIN'].includes(roleUpper)) return { ok: true };

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
}
