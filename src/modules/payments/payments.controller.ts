import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { CreatePreferenceUseCase } from './application/usecases/create-preference.usecase.js';
import { HandleWebhookUseCase } from './application/usecases/handle-webhook.usecase.js';
import { ConfirmPaymentUseCase } from './application/usecases/confirm-payment.usecase.js';

@Controller('api/payments')
export class PaymentsController {
  constructor(
    private readonly createPrefUC: CreatePreferenceUseCase,
    private readonly webhookUC: HandleWebhookUseCase,
    private readonly confirmUC: ConfirmPaymentUseCase,
  ) {}

  // Mantiene compatibilidad: POST /api/payments/create
  @Post('create')
  async create(@Body() dto: CreatePaymentDto, @Req() req: Request) {
    return this.createPrefUC.execute(dto, req);
  }

  // Webhook MP: POST /api/payments/webhook
  @Post('webhook')
  async webhook(@Req() req: Request) {
    // Importante: MP reintenta si no recibe 200. Aquí siempre devolvemos 200.
    return this.webhookUC.execute(req);
  }

  // Confirmación post-pago desde el front: POST /api/payments/confirm
  @Post('confirm')
  async confirm(@Body() body: any, @Req() req: Request) {
    return this.confirmUC.execute(body, req);
  }
}
