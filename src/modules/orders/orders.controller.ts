import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ListOrdersUseCase } from './application/usecases/list-orders.usecase.js';
import { GetOrderDetailUseCase } from './application/usecases/get-order-detail.usecase.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { ListOrdersDto } from './dto/list-orders.dto.js';

@Controller('api')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'DEV_ADMIN', 'STAFF')
export class OrdersController {
  constructor(private readonly listUC: ListOrdersUseCase, private readonly detailUC: GetOrderDetailUseCase) {}

  // Mantiene compatibilidad con el frontend existente
  @Get('orders')
  async list(@Query() q: ListOrdersDto) {
    return this.listUC.execute({
      status: q.status,
      q: q.q,
      from: q.from,
      to: q.to,
    });
  }

  // Endpoint adicional útil para detalle (no rompe el front)
  @Get('orders/:orderId')
  async detail(@Param('orderId') orderId: string) {
    const out = await this.detailUC.execute(Number(orderId));
    if (!out) return { error: 'not_found' };
    return out;
  }
}
