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
import { PrismaService } from '../../../../common/prisma/prisma.service.js';
import { MpClientService } from '../../infrastructure/mp-client.service.js';
let HandleWebhookUseCase = class HandleWebhookUseCase {
    prisma;
    mp;
    constructor(prisma, mp) {
        this.prisma = prisma;
        this.mp = mp;
    }
    async execute(req) {
        try {
            const query = req.query || {};
            const body = req.body || {};
            const topic = String(query.topic || body.topic || '').toLowerCase();
            const type = String(query.type || body.type || '').toLowerCase();
            const paymentId = String(query.id || '').trim() ||
                String(body?.data?.id || '').trim() ||
                String(body?.id || '').trim();
            const isPayment = topic === 'payment' || type === 'payment';
            if (!paymentId || !isPayment)
                return { ok: true };
            // Si no está configurado MP, igual respondemos 200 para evitar retries infinitos.
            if (!process.env.MP_ACCESS_TOKEN)
                return { ok: true };
            const pay = this.mp.payment();
            const out = await pay.get({ id: paymentId });
            const data = out?.response ?? out;
            const status = String(data?.status || '').toUpperCase();
            await this.prisma.order.updateMany({ where: { paymentId }, data: { paymentStatus: status, status } });
            return { ok: true };
        }
        catch (e) {
            // eslint-disable-next-line no-console
            console.error('Webhook error:', e);
            return { ok: true };
        }
    }
};
HandleWebhookUseCase = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService, MpClientService])
], HandleWebhookUseCase);
export { HandleWebhookUseCase };
//# sourceMappingURL=handle-webhook.usecase.js.map