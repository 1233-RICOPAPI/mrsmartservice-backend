var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.js';
import { MpClientService } from './infrastructure/mp-client.service.js';
import { CreatePreferenceUseCase } from './application/usecases/create-preference.usecase.js';
import { ConfirmPaymentUseCase } from './application/usecases/confirm-payment.usecase.js';
import { HandleWebhookUseCase } from './application/usecases/handle-webhook.usecase.js';
let PaymentsModule = class PaymentsModule {
};
PaymentsModule = __decorate([
    Module({
        controllers: [PaymentsController],
        providers: [
            MpClientService,
            CreatePreferenceUseCase,
            ConfirmPaymentUseCase,
            HandleWebhookUseCase,
        ],
        exports: [MpClientService],
    })
], PaymentsModule);
export { PaymentsModule };
//# sourceMappingURL=payments.module.js.map