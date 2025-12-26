import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

type Range = 'day' | 'week' | 'month' | 'year';

function startDateForRange(range: Range): Date {
  const now = new Date();
  if (range === 'day') return new Date(now.getTime() - 23 * 60 * 60 * 1000);
  if (range === 'week') return new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  if (range === 'year') {
    const d = new Date(now);
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCMonth(d.getUTCMonth() - 11);
    return d;
  }
  // month
  return new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
}

function fmtLabel(range: Range, d: Date) {
  // Colombia (-05:00). Usamos locale; el browser/Node lo formatea.
  if (range === 'day') return `${String(d.getHours()).padStart(2, '0')}h`;
  if (range === 'week') return d.toLocaleDateString('es-CO', { weekday: 'short' });
  if (range === 'year') return d.toLocaleDateString('es-CO', { month: 'short' });
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function bucketKey(range: Range, d: Date): string {
  // Normalizamos a hora/día/mes en TZ -05:00 aproximado por offset fijo.
  const offsetMs = 5 * 60 * 60 * 1000;
  const local = new Date(d.getTime() - offsetMs);
  if (range === 'day') {
    return `${local.getUTCFullYear()}-${local.getUTCMonth()}-${local.getUTCDate()}-${local.getUTCHours()}`;
  }
  if (range === 'year') {
    return `${local.getUTCFullYear()}-${local.getUTCMonth()}`;
  }
  return `${local.getUTCFullYear()}-${local.getUTCMonth()}-${local.getUTCDate()}`;
}

function bucketDateFromKey(range: Range, key: string): Date {
  // Reconstruye fecha aproximada del bucket (en TZ local) para label.
  const parts = key.split('-').map((x) => Number(x));
  if (range === 'day') {
    const [y, m, day, h] = parts;
    return new Date(Date.UTC(y, m, day, h, 0, 0));
  }
  if (range === 'year') {
    const [y, m] = parts;
    return new Date(Date.UTC(y, m, 1, 0, 0, 0));
  }
  const [y, m, day] = parts;
  return new Date(Date.UTC(y, m, day, 0, 0, 0));
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async sales(rangeIn: string) {
    const range = (String(rangeIn || 'month').toLowerCase() as Range) || 'month';
    const start = startDateForRange(range);

    const approved = await this.prisma.order.findMany({
      where: { status: 'approved', createdAt: { gte: start } },
      select: { totalAmount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const totalsOrders = approved.length;
    const ingresos = approved.reduce((acc, o) => acc + Number(o.totalAmount), 0);
    const ticket = totalsOrders > 0 ? Math.round(ingresos / totalsOrders) : 0;

    const global = await this.prisma.order.findMany({
      where: { status: { not: 'initiated' }, createdAt: { gte: start } },
      select: { status: true },
    });
    const total_orders = global.length;
    const approved_orders = global.filter((o) => o.status === 'approved').length;
    const rate = total_orders > 0 ? Math.round((approved_orders / total_orders) * 100) : 0;

    // Serie
    const bucketMap = new Map<string, number>();
    for (const o of approved) {
      const k = bucketKey(range, o.createdAt);
      bucketMap.set(k, (bucketMap.get(k) || 0) + Number(o.totalAmount));
    }

    // Limit
    const limit = range === 'day' ? 24 : range === 'week' ? 7 : range === 'year' ? 12 : 30;
    const keys = Array.from(bucketMap.keys()).sort((a, b) => (a > b ? 1 : -1)).slice(-limit);
    const series = keys.map((k) => {
      const d = bucketDateFromKey(range, k);
      return { label: fmtLabel(range, d), value: Number(bucketMap.get(k) || 0) };
    });

    return {
      ingresos: Math.round(ingresos),
      ingresosDelta: 0,
      ordenes: totalsOrders,
      ordenesDelta: 0,
      ticket,
      ticketDelta: 0,
      rate,
      rateDelta: 0,
      series,
    };
  }
}
