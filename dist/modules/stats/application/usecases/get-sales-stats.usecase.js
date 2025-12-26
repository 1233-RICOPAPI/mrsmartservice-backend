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
import { StatsRepository } from '../../stats.repository.js';
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
    return new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
}
function fmtLabel(range, d) {
    if (range === 'day')
        return `${String(d.getHours()).padStart(2, '0')}h`;
    if (range === 'week')
        return d.toLocaleDateString('es-CO', { weekday: 'short' });
    if (range === 'year')
        return d.toLocaleDateString('es-CO', { month: 'short' });
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}
function bucketKey(range, d) {
    // Normalizamos con offset fijo de Colombia (-05:00) para agrupar coherente.
    const local = new Date(d.getTime() - 5 * 60 * 60 * 1000);
    if (range === 'day')
        return `${local.getUTCFullYear()}-${local.getUTCMonth()}-${local.getUTCDate()}-${local.getUTCHours()}`;
    if (range === 'year')
        return `${local.getUTCFullYear()}-${local.getUTCMonth()}`;
    return `${local.getUTCFullYear()}-${local.getUTCMonth()}-${local.getUTCDate()}`;
}
function bucketsForRange(range) {
    const now = new Date();
    const out = [];
    if (range === 'day') {
        for (let i = 23; i >= 0; i--)
            out.push(new Date(now.getTime() - i * 60 * 60 * 1000));
        return out;
    }
    if (range === 'week') {
        for (let i = 6; i >= 0; i--)
            out.push(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
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
    for (let i = 29; i >= 0; i--)
        out.push(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
    return out;
}
let GetSalesStatsUseCase = class GetSalesStatsUseCase {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async execute(range) {
        const start = startDateForRange(range);
        const approved = await this.repo.findApprovedSince(start);
        const totalsOrders = approved.length;
        const ingresos = approved.reduce((acc, o) => acc + Number(o.totalAmount), 0);
        const ticket = totalsOrders > 0 ? Math.round(ingresos / totalsOrders) : 0;
        const global = await this.repo.findNonInitiatedSince(start);
        const total_orders = global.length;
        const approved_orders = global.filter((o) => o.status === 'approved').length;
        const rate = total_orders > 0 ? Math.round((approved_orders / total_orders) * 100) : 0;
        const bucketMap = new Map();
        for (const o of approved) {
            const k = bucketKey(range, o.createdAt);
            bucketMap.set(k, (bucketMap.get(k) || 0) + Number(o.totalAmount));
        }
        const buckets = bucketsForRange(range);
        const labels = [];
        const series = [];
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
};
GetSalesStatsUseCase = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [StatsRepository])
], GetSalesStatsUseCase);
export { GetSalesStatsUseCase };
//# sourceMappingURL=get-sales-stats.usecase.js.map