var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersRepository } from './orders.repository.js';
import { ListOrdersUseCase } from './application/usecases/list-orders.usecase.js';
import { GetOrderDetailUseCase } from './application/usecases/get-order-detail.usecase.js';
let OrdersModule = class OrdersModule {
};
OrdersModule = __decorate([
    Module({
        controllers: [OrdersController],
        providers: [OrdersRepository, ListOrdersUseCase, GetOrderDetailUseCase],
        exports: [OrdersRepository],
    })
], OrdersModule);
export { OrdersModule };
//# sourceMappingURL=orders.module.js.map