import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../../../common/prisma/prisma.service.js';
import { MpClientService } from '../../infrastructure/mp-client.service.js';

@Injectable()
export class HandleWebhookUseCase {
  constructor(private readonly prisma: PrismaService, private readonly mp: MpClientService) {}

  async execute(req: Request) {
    try {
      const query: any = req.query || {};
      const body: any = (req as any).body || {};
      const topic = String(query.topic || body.topic || '').toLowerCase();
      const type = String(query.type || body.type || '').toLowerCase();

      const paymentId =
        String(query.id || '').trim() ||
        String(body?.data?.id || '').trim() ||
        String(body?.id || '').trim();

      const isPayment = topic === 'payment' || type === 'payment';
      if (!paymentId || !isPayment) return { ok: true };

      // Si no está configurado MP, igual respondemos 200 para evitar retries infinitos.
      if (!process.env.MP_ACCESS_TOKEN) return { ok: true };

      const pay = this.mp.payment();
      const out = await pay.get({ id: paymentId });
      const data: any = (out as any)?.response ?? out;
      const status = String(data?.status || '').toUpperCase();

      await this.prisma.order.updateMany({ where: { paymentId }, data: { paymentStatus: status, status } });
      return { ok: true };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Webhook error:', e);
      return { ok: true };
    }
  }
}
