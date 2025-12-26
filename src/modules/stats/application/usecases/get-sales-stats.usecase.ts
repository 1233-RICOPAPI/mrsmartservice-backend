import { Injectable } from '@nestjs/common';
import { StatsRepository } from '../../stats.repository.js';

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
  return new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
}

function fmtLabel(range: Range, d: Date) {
  if (range === 'day') return `${String(d.getHours()).padStart(2, '0')}h`;
  if (range === 'week') return d.toLocaleDateString('es-CO', { weekday: 'short' });
  if (range === 'year') return d.toLocaleDateString('es-CO', { month: 'short' });
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function bucketKey(range: Range, d: Date): string {
  // Normalizamos con offset fijo de Colombia (-05:00) para agrupar coherente.
  const local = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  if (range === 'day') return `${local.getUTCFullYear()}-${local.getUTCMonth()}-${local.getUTCDate()}-${local.getUTCHours()}`;
  if (range === 'year') return `${local.getUTCFullYear()}-${local.getUTCMonth()}`;
  return `${local.getUTCFullYear()}-${local.getUTCMonth()}-${local.getUTCDate()}`;
}

function bucketsForRange(range: Range): Date[] {
  const now = new Date();
  const out: Date[] = [];
  if (range === 'day') {
    for (let i = 23; i >= 0; i--) out.push(new Date(now.getTime() - i * 60 * 60 * 1000));
    return out;
  }
  if (range === 'week') {
    for (let i = 6; i >= 0; i--) out.push(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
    return out;
  }
  if (range === 'year') {
    const d = new Date(now);
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCMonth(d.getUTCMonth() - 11);
    for (let i = 0; i < 12; i++) {
      const dd = new Date(d);
      dd.setUTCMonth(d.getUTCMonth() + i);
      out.push(dd);
    }
    return out;
  }
  // month: últimos 30 días
  for (let i = 29; i >= 0; i--) out.push(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
  return out;
}

@Injectable()
export class GetSalesStatsUseCase {
  constructor(private readonly repo: StatsRepository) {}

  async execute(range: Range) {
    const start = startDateForRange(range);

    const approved = await this.repo.findApprovedSince(start);
    const totalsOrders = approved.length;
    const ingresos = approved.reduce((acc, o) => acc + Number(o.totalAmount), 0);
    const ticket = totalsOrders > 0 ? Math.round(ingresos / totalsOrders) : 0;

    const global = await this.repo.findNonInitiatedSince(start);
    const total_orders = global.length;
    const approved_orders = global.filter((o) => o.status === 'approved').length;
    const rate = total_orders > 0 ? Math.round((approved_orders / total_orders) * 100) : 0;

    const bucketMap = new Map<string, number>();
    for (const o of approved) {
      const k = bucketKey(range, o.createdAt);
      bucketMap.set(k, (bucketMap.get(k) || 0) + Number(o.totalAmount));
    }

    const buckets = bucketsForRange(range);
    const labels: string[] = [];
    const series: number[] = [];

    for (const d of buckets) {
      labels.push(fmtLabel(range, d));
      series.push(bucketMap.get(bucketKey(range, d)) || 0);
    }

    return {
      range,
      ingresos,
      ticket,
      rate,
      total_orders,
      approved_orders,
      series: {
        labels,
        values: series,
      },
    };
  }
}
