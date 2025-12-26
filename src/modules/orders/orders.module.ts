import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersRepository } from './orders.repository.js';
import { ListOrdersUseCase } from './application/usecases/list-orders.usecase.js';
import { GetOrderDetailUseCase } from './application/usecases/get-order-detail.usecase.js';

@Module({
  controllers: [OrdersController],
  providers: [OrdersRepository, ListOrdersUseCase, GetOrderDetailUseCase],
  exports: [OrdersRepository],
})
export class OrdersModule {}
