import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';
import { GetFinanzasReportUseCase } from './application/usecases/get-finanzas-report.usecase.js';

@Module({
  controllers: [ReportsController],
  providers: [GetFinanzasReportUseCase],
})
export class ReportsModule {}
