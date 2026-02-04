import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Inject, Injectable } from '@nestjs/common';
import { AUTH_REPOSITORY, type AuthRepositoryPort } from '../../domain/auth-repository.port.js';

@Injectable()
export class LoginUseCase {
  constructor(@Inject(AUTH_REPOSITORY) private readonly repo: AuthRepositoryPort) {}

  async execute(email: string, password: string) {
    const normalizedEmail = (email && typeof email === 'string' ? email.trim() : '').toLowerCase();
    const trimmedPassword = password && typeof password === 'string' ? password.trim() : '';

    if (!normalizedEmail || !trimmedPassword) return { error: 'missing_credentials' };

    const user = await this.repo.findByEmail(normalizedEmail);
    if (!user) {
      console.warn('[Login] invalid_credentials: user_not_found', { email: normalizedEmail });
      return { error: 'invalid_credentials' };
    }

    const ok = await bcrypt.compare(trimmedPassword, user.passwordHash);
    if (!ok) {
      const hashIsBcrypt = user.passwordHash.startsWith('$2');
      console.warn('[Login] invalid_credentials: password_mismatch', {
        email: normalizedEmail,
        userId: user.userId,
        hashIsBcrypt,
      });
      return { error: 'invalid_credentials' };
    }

    if (!process.env.JWT_SECRET) return { error: 'server_config_error' };

    const payload = { sub: user.userId, user_id: user.userId, email: user.email, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    return { token, role: user.role, email: user.email };
  }
}
