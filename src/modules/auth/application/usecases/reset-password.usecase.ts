import bcrypt from 'bcryptjs';
import { Inject, Injectable } from '@nestjs/common';
import { AUTH_REPOSITORY, type AuthRepositoryPort } from '../../domain/auth-repository.port.js';

@Injectable()
export class ResetPasswordUseCase {
  constructor(@Inject(AUTH_REPOSITORY) private readonly repo: AuthRepositoryPort) {}

  async execute(token: string, password: string) {
    if (!token || !password) return { error: 'bad_request' };
    if (password.length < 8) return { error: 'weak_password' };

    const row = await this.repo.findPasswordResetByToken(token);
    if (!row) return { error: 'invalid_token' };

    const expired = new Date(row.expiresAt) < new Date();
    if (row.used || expired) return { error: 'expired_token' };

    const hash = await bcrypt.hash(password, 10);
    await this.repo.updateUserPassword(Number(row.userId), hash);
    await this.repo.markPasswordResetUsed(Number(row.id));
    return { ok: true };
  }
}
