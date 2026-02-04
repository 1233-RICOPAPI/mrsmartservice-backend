import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';
import { GetFinanzasReportUseCase } from './application/usecases/get-finanzas-report.usecase.js';
import { ExportReportUseCase } from './application/usecases/export-report.usecase.js';
import { OrdersModule } from '../orders/orders.module.js';

@Module({
  imports: [OrdersModule],
  controllers: [ReportsController],
  providers: [GetFinanzasReportUseCase, ExportReportUseCase],
})
export class ReportsModule {}
