import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  listPanelUsers() {
    return this.prisma.user.findMany({
      where: { role: 'USER' },
      orderBy: { createdAt: 'desc' },
      select: { userId: true, email: true, role: true, createdAt: true },
    });
  }

  countPanelUsers() {
    return this.prisma.user.count({ where: { role: 'USER' } });
  }

  existsByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, select: { userId: true } });
  }

  createUser(email: string, password_hash: string) {
    return this.prisma.user.create({
      data: { email, passwordHash: password_hash, role: 'USER' },
      select: { userId: true, email: true, role: true, createdAt: true },
    });
  }

  getById(id: number) {
    return this.prisma.user.findUnique({ where: { userId: id }, select: { userId: true, email: true, role: true } });
  }

  deleteById(id: number) {
    return this.prisma.user.delete({ where: { userId: id } });
  }
}
