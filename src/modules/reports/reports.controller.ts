import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { FinanzasReportDto } from './dto/finanzas-report.dto.js';
import { GetFinanzasReportUseCase } from './application/usecases/get-finanzas-report.usecase.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'DEV_ADMIN')
@Controller('api/reports')
export class ReportsController {
  constructor(private readonly finanzasUC: GetFinanzasReportUseCase) {}

  @Get('finanzas')
  async finanzas(@Query() q: FinanzasReportDto, @Res() res: Response) {
    const format = q.format === 'pdf' ? 'pdf' : 'xlsx';

    try {
      const proxRes = await this.finanzasUC.execute(format);

      if (!proxRes.ok) {
        const txt = await proxRes.text().catch(() => null);
        console.error('Python report failed', proxRes.status, txt);
        return res.status(502).json({ error: 'report_proxy_failed', status: proxRes.status });
      }

      const ct = proxRes.headers.get('content-type') || (format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const buf = Buffer.from(await proxRes.arrayBuffer());

      res.setHeader('Content-Type', ct);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="finanzas.${format}"`
      );
      return res.status(200).send(buf);
    } catch (e) {
      console.error('report proxy error', e);
      return res.status(502).json({ error: 'report_proxy_error' });
    }
  }
}
