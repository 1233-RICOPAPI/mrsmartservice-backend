import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { UsersRepository } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async listPanelUsers() {
    const users = await this.repo.listPanelUsers();
    return users.map((u) => ({ user_id: u.userId, email: u.email, role: u.role, created_at: u.createdAt }));
  }

  async createPanelUser(body: any) {
    const { email, password } = body || {};
    if (!email || !password) throw new BadRequestException('missing_fields');

    const normalizedEmail = String(email).trim().toLowerCase();
    if (String(password).length < 8) throw new BadRequestException('weak_password');

    const currentCount = await this.repo.countPanelUsers();
    if (currentCount >= 3) throw new BadRequestException('user_limit_reached');

    const exists = await this.repo.existsByEmail(normalizedEmail);
    if (exists) throw new BadRequestException('email_in_use');

    const password_hash = await bcrypt.hash(String(password), 10);
    const u = await this.repo.createUser(normalizedEmail, password_hash);
    return { user_id: u.userId, email: u.email, role: u.role, created_at: u.createdAt };
  }

  async deletePanelUser(id: number, meId: number | null) {
    if (!Number.isFinite(id)) throw new BadRequestException('invalid_id');
    if (meId && meId === id) throw new BadRequestException('cannot_delete_self');

    const u = await this.repo.getById(id);
    if (!u) throw new NotFoundException('user_not_found');

    const email = String(u.email || '').toLowerCase();
    const role = String(u.role || '').toUpperCase();
    if (email === 'admin@tienda.com' || email === 'dev@tienda.com' || role === 'ADMIN' || role === 'DEV_ADMIN') {
      throw new ForbiddenException('cannot_delete_seed');
    }

    await this.repo.deleteById(id);
    return { ok: true };
  }
}
