import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { UsersRepository } from './users.repository.js';
import { UpdateContadorDto } from './dto/update-contador.dto.js';

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

  async getContadorAccount() {
    const contador = await this.repo.findContador();
    if (!contador) throw new NotFoundException('contador_not_found');
    return {
      user_id: contador.userId,
      email: contador.email,
      role: contador.role,
      created_at: contador.createdAt,
    };
  }

  async updateContadorAccount(dto: UpdateContadorDto) {
    const contador = await this.repo.findContador();
    if (!contador) throw new NotFoundException('contador_not_found');

    const updates: { email?: string; passwordHash?: string } = {};
    let normalizedEmail: string | undefined;

    if (dto.email !== undefined) {
      normalizedEmail = String(dto.email || '').trim().toLowerCase();
      if (!normalizedEmail) throw new BadRequestException('invalid_email');
      const existing = await this.repo.findByEmail(normalizedEmail);
      if (existing && existing.userId !== contador.userId) throw new BadRequestException('email_in_use');
      updates.email = normalizedEmail;
    }

    if (dto.password) {
      const trimmed = String(dto.password).trim();
      if (trimmed.length < 8) throw new BadRequestException('weak_password');
      updates.passwordHash = await bcrypt.hash(trimmed, 10);
    }

    if (!Object.keys(updates).length) {
      return {
        user_id: contador.userId,
        email: contador.email,
        role: contador.role,
        created_at: contador.createdAt,
      };
    }

    const updated = await this.repo.updateById(contador.userId, updates);
    return {
      user_id: updated.userId,
      email: updated.email,
      role: updated.role,
      created_at: updated.createdAt,
    };
  }
}
