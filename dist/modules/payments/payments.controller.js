var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, Controller, Post, Req } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { CreatePreferenceUseCase } from './application/usecases/create-preference.usecase.js';
import { HandleWebhookUseCase } from './application/usecases/handle-webhook.usecase.js';
import { ConfirmPaymentUseCase } from './application/usecases/confirm-payment.usecase.js';
let PaymentsController = class PaymentsController {
    createPrefUC;
    webhookUC;
    confirmUC;
    constructor(createPrefUC, webhookUC, confirmUC) {
        this.createPrefUC = createPrefUC;
        this.webhookUC = webhookUC;
        this.confirmUC = confirmUC;
    }
    // Mantiene compatibilidad: POST /api/payments/create
    async create(dto, req) {
        return this.createPrefUC.execute(dto, req);
    }
    // Webhook MP: POST /api/payments/webhook
    async webhook(req) {
        // Importante: MP reintenta si no recibe 200. Aquí siempre devolvemos 200.
        return this.webhookUC.execute(req);
    }
    // Confirmación post-pago desde el front: POST /api/payments/confirm
    async confirm(body, req) {
        return this.confirmUC.execute(body, req);
    }
};
__decorate([
    Post('create'),
    __param(0, Body()),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreatePaymentDto, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "create", null);
__decorate([
    Post('webhook'),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "webhook", null);
__decorate([
    Post('confirm'),
    __param(0, Body()),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "confirm", null);
PaymentsController = __decorate([
    Controller('api/payments'),
    __metadata("design:paramtypes", [CreatePreferenceUseCase,
        HandleWebhookUseCase,
        ConfirmPaymentUseCase])
], PaymentsController);
export { PaymentsController };
//# sourceMappingURL=payments.controller.js.map