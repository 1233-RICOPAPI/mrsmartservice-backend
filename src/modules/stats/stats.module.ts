import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller.js';
import { StatsRepository } from './stats.repository.js';
import { GetSalesStatsUseCase } from './application/usecases/get-sales-stats.usecase.js';

@Module({
  controllers: [StatsController],
  providers: [StatsRepository, GetSalesStatsUseCase],
})
export class StatsModule {}
