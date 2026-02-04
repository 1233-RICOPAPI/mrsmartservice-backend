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

  /** Suma de domicilio_costo de órdenes aprobadas en rango (egresos). */
  async sumEgresosDomicilio(from?: string, to?: string) {
    const start = from ? new Date(`${from}T00:00:00-05:00`) : null;
    const end = to ? new Date(`${to}T23:59:59-05:00`) : null;
    const where: any = { status: 'APPROVED' };
    if (start || end) {
      where.createdAt = {};
      if (start) where.createdAt.gte = start;
      if (end) where.createdAt.lte = end;
    }
    const rows = await this.prisma.order.findMany({
      where,
      select: { domicilioCosto: true },
    });
    return rows.reduce((s, o) => s + Number(o.domicilioCosto || 0), 0);
  }
}
