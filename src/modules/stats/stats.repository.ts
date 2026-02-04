import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class StatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Órdenes aprobadas (ventas completadas) en el rango. El flujo de pago guarda status 'APPROVED'. */
  findApprovedSince(start: Date) {
    return this.prisma.order.findMany({
      where: { status: 'APPROVED', createdAt: { gte: start } },
      select: { totalAmount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Órdenes no iniciadas (para tasa de aprobación). */
  findNonInitiatedSince(start: Date) {
    return this.prisma.order.findMany({
      where: { status: { not: 'INITIATED' }, createdAt: { gte: start } },
      select: { status: true },
    });
  }
}
