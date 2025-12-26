import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { StatsSalesDto } from './dto/stats-sales.dto.js';
import { GetSalesStatsUseCase } from './application/usecases/get-sales-stats.usecase.js';

@Controller('api/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'DEV_ADMIN', 'STAFF')
export class StatsController {
  constructor(private readonly salesUC: GetSalesStatsUseCase) {}

  @Get('sales')
  async sales(@Query() q: StatsSalesDto) {
    return this.salesUC.execute(q.range as any);
  }
}
