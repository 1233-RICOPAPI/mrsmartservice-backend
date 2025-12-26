import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../orders.repository.js';

@Injectable()
export class ListOrdersUseCase {
  constructor(private readonly repo: OrdersRepository) {}

  execute(params: { status?: string; q?: string; from?: string; to?: string }) {
    return this.repo.list(params);
  }
}
