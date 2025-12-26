import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../orders.repository.js';

@Injectable()
export class GetOrderDetailUseCase {
  constructor(private readonly repo: OrdersRepository) {}

  async execute(orderId: number) {
    const out = await this.repo.getOrder(orderId);
    return out || null;
  }
}
