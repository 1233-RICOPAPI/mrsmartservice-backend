import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { StatsSalesDto } from './dto/stats-sales.dto.js';
import { GetSalesStatsUseCase } from './application/usecases/get-sales-stats.usecase.js';
import { StatsRepository } from './stats.repository.js';

@Controller('api/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'DEV_ADMIN', 'STAFF', 'CONTADOR')
export class StatsController {
  constructor(
    private readonly salesUC: GetSalesStatsUseCase,
    private readonly statsRepo: StatsRepository,
  ) {}

  @Get('sales')
  async sales(@Query() q: StatsSalesDto) {
    return this.salesUC.execute(q.range as any);
  }

  @Get('egresos')
  async egresos(@Query() q: { from?: string; to?: string }) {
    const total = await this.statsRepo.sumEgresosDomicilio(q.from, q.to);
    return { totalEgresos: total, totalDomicilios: total };
  }
}
