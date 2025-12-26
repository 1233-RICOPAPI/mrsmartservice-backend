import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class StatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findApprovedSince(start: Date) {
    return this.prisma.order.findMany({
      where: { status: 'approved', createdAt: { gte: start } },
      select: { totalAmount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  findNonInitiatedSince(start: Date) {
    return this.prisma.order.findMany({
      where: { status: { not: 'initiated' }, createdAt: { gte: start } },
      select: { status: true },
    });
  }
}
