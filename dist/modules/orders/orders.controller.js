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
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ListOrdersUseCase } from './application/usecases/list-orders.usecase.js';
import { GetOrderDetailUseCase } from './application/usecases/get-order-detail.usecase.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { ListOrdersDto } from './dto/list-orders.dto.js';
let OrdersController = class OrdersController {
    listUC;
    detailUC;
    constructor(listUC, detailUC) {
        this.listUC = listUC;
        this.detailUC = detailUC;
    }
    // Mantiene compatibilidad con el frontend existente
    async list(q) {
        return this.listUC.execute({
            status: q.status,
            q: q.q,
            from: q.from,
            to: q.to,
        });
    }
    // Endpoint adicional útil para detalle (no rompe el front)
    async detail(orderId) {
        const out = await this.detailUC.execute(Number(orderId));
        if (!out)
            return { error: 'not_found' };
        return out;
    }
};
__decorate([
    Get('orders'),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ListOrdersDto]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "list", null);
__decorate([
    Get('orders/:orderId'),
    __param(0, Param('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "detail", null);
OrdersController = __decorate([
    Controller('api'),
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles('ADMIN', 'DEV_ADMIN', 'STAFF'),
    __metadata("design:paramtypes", [ListOrdersUseCase, GetOrderDetailUseCase])
], OrdersController);
export { OrdersController };
//# sourceMappingURL=orders.controller.js.map