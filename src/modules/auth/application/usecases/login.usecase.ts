import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Inject, Injectable } from '@nestjs/common';
import { AUTH_REPOSITORY, type AuthRepositoryPort } from '../../domain/auth-repository.port.js';

@Injectable()
export class LoginUseCase {
  constructor(@Inject(AUTH_REPOSITORY) private readonly repo: AuthRepositoryPort) {}

  async execute(email: string, password: string) {
    if (!email || !password) return { error: 'missing_credentials' };

    const user = await this.repo.findByEmail(email);
    if (!user) return { error: 'invalid_credentials' };

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return { error: 'invalid_credentials' };

    if (!process.env.JWT_SECRET) return { error: 'server_config_error' };

    const payload = { sub: user.userId, user_id: user.userId, email: user.email, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    return { token, role: user.role, email: user.email };
  }
}
