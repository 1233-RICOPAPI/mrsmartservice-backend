import bcrypt from 'bcryptjs';
import { Inject, Injectable } from '@nestjs/common';
import { AUTH_REPOSITORY, type AuthRepositoryPort } from '../../domain/auth-repository.port.js';

@Injectable()
export class ChangePasswordUseCase {
  constructor(@Inject(AUTH_REPOSITORY) private readonly repo: AuthRepositoryPort) {}

  async execute(userId: number, oldPassword: string, newPassword: string) {
    if (!oldPassword || !newPassword) return { error: 'missing_fields' };
    if (newPassword.length < 8) return { error: 'weak_password' };

    const u = await this.repo.getUserAuth(userId);
    if (!u) return { error: 'user_not_found' };

    const ok = await bcrypt.compare(oldPassword, u.passwordHash);
    if (!ok) return { error: 'invalid_password' };

    const newHash = await bcrypt.hash(newPassword, 10);
    await this.repo.updateUserPassword(userId, newHash);
    return { success: true };
  }
}
