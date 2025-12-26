import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import type { AuthRepositoryPort } from '../domain/auth-repository.port.js';

@Injectable()
export class AuthPrismaRepository implements AuthRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { userId: true, email: true, passwordHash: true, role: true, createdAt: true },
    });
  }

  async getProfile(userId: number) {
    return this.prisma.user.findUnique({
      where: { userId },
      select: { userId: true, email: true, role: true, createdAt: true },
    });
  }

  async getUserAuth(userId: number) {
    return this.prisma.user.findUnique({
      where: { userId },
      select: { userId: true, passwordHash: true, role: true },
    });
  }

  async createPasswordReset(userId: number, token: string, expiresAt: Date) {
    const created = await this.prisma.passwordReset.create({
      data: { userId, token, expiresAt, used: false },
      select: { id: true },
    });
    return created.id;
  }

  async findPasswordResetByToken(token: string) {
    return this.prisma.passwordReset.findUnique({
      where: { token },
      select: { id: true, userId: true, expiresAt: true, used: true },
    });
  }

  async markPasswordResetUsed(id: number) {
    await this.prisma.passwordReset.update({ where: { id }, data: { used: true } });
  }

  async updateUserPassword(userId: number, passwordHash: string) {
    await this.prisma.user.update({ where: { userId }, data: { passwordHash } });
  }
}
