import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Inject, Injectable } from '@nestjs/common';
import { AUTH_REPOSITORY, type AuthRepositoryPort } from '../../domain/auth-repository.port.js';
import { resolveFrontBase } from '../utils/front-base.js';

const ALLOWED_RESET_EMAILS = ['aaronmotta5@gmail.com', 'yesfri@hotmail.es'];

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(@Inject(AUTH_REPOSITORY) private readonly repo: AuthRepositoryPort) {}

  async execute(email: string) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return { error: 'email_required' };

    const user = await this.repo.findByEmail(normalizedEmail);
    if (!user) return { ok: true };

    const allowed =
      ALLOWED_RESET_EMAILS.includes(normalizedEmail) ||
      ['ADMIN', 'DEV_ADMIN'].includes(String(user.role || '').toUpperCase());
    if (!allowed) return { ok: true };

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

      const subject = 'Recupera tu contraseña - MR SmartService';
      const textBody = [
        'Hola,',
        '',
        'Recibimos una solicitud para recuperar tu contraseña de MR SmartService.',
        `Haz clic en el siguiente enlace para continuar: ${resetUrl}`,
        '',
        'Si tú no solicitaste este cambio, ignora este mensaje.',
        '',
        'Equipo MR SmartService',
      ].join('\n');

      const htmlBody = `
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0f172a">
          <p>Hola,</p>
          <p>Recibimos una solicitud para recuperar tu contraseña de <strong>MR SmartService</strong>.</p>
          <p>
            <a href="${resetUrl}" style="background:#1d4ed8;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block;">
              Recuperar contraseña
            </a>
          </p>
          <p>Si el botón no funciona copia y pega este enlace en tu navegador:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p style="margin-top:24px;">Si tú no solicitaste este cambio, ignora este mensaje.</p>
          <p style="margin-top:32px;">Equipo MR SmartService</p>
        </div>
      `;

      await transporter.sendMail({
        from: `"MR SmartService" <${process.env.SMTP_USER}>`,
        to: normalizedEmail,
        subject,
        text: textBody,
        html: htmlBody,
        replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_USER,
        headers: {
          'X-Priority': '3',
          'X-Mailer': 'MR SmartService',
        },
      });
    }

    return { ok: true, resetUrl: isDev ? resetUrl : undefined };
  }
}
