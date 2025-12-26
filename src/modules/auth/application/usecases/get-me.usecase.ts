import { Inject, Injectable } from '@nestjs/common';
import { AUTH_REPOSITORY, type AuthRepositoryPort } from '../../domain/auth-repository.port.js';

@Injectable()
export class GetMeUseCase {
  constructor(@Inject(AUTH_REPOSITORY) private readonly repo: AuthRepositoryPort) {}

  async execute(userId: number) {
    const p = await this.repo.getProfile(userId);
    if (!p) return null;
    // compat con front legacy (snake_case)
    return { user_id: p.userId, email: p.email, role: p.role, created_at: p.createdAt };
  }
}
