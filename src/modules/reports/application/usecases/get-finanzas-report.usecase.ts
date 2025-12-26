import { Injectable } from '@nestjs/common';

@Injectable()
export class GetFinanzasReportUseCase {
  async execute(format: 'pdf' | 'xlsx') {
    const pythonBase = process.env.PY_ANALYTICS_URL || 'http://127.0.0.1:5001';
    const reportSecret = process.env.REPORT_SECRET || '';
    const url = `${pythonBase.replace(/\/+$/, '')}/reports/finanzas?formato=${encodeURIComponent(format)}`;

    const proxRes = await fetch(url, {
      method: 'GET',
      headers: reportSecret ? { 'X-REPORT-SECRET': reportSecret } : {},
    });

    return proxRes;
  }
}
