var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
function startDateForRange(range) {
    const now = new Date();
    if (range === 'day')
        return new Date(now.getTime() - 23 * 60 * 60 * 1000);
    if (range === 'week')
        return new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
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
function fmtLabel(range, d) {
    // Colombia (-05:00). Usamos locale; el browser/Node lo formatea.
    if (range === 'day')
        return `${String(d.getHours()).padStart(2, '0')}h`;
    if (range === 'week')
        return d.toLocaleDateString('es-CO', { weekday: 'short' });
    if (range === 'year')
        return d.toLocaleDateString('es-CO', { month: 'short' });
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}
function bucketKey(range, d) {
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
function bucketDateFromKey(range, key) {
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
let StatsService = class StatsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async sales(rangeIn) {
        const range = String(rangeIn || 'month').toLowerCase() || 'month';
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
        const bucketMap = new Map();
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
};
StatsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], StatsService);
export { StatsService };
//# sourceMappingURL=stats.service.js.map