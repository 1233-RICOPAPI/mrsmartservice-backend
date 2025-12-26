import { Injectable } from '@nestjs/common';
import { OrdersRepository } from './orders.repository.js';

export type OrderListRow = {
  order_id: number;
  created_at: string;
  total_amount: number;
  status: string;
  email: string;
  customer: string;
  domicilio_modo: string | null;
  domicilio_nombre: string | null;
  domicilio_direccion: string | null;
  domicilio_barrio: string | null;
  domicilio_ciudad: string | null;
  domicilio_telefono: string | null;
  domicilio_nota: string | null;
  fecha_domicilio: string | null;
  estado_domicilio: string | null;
};

@Injectable()
export class OrdersService {
  constructor(private readonly repo: OrdersRepository) {}

  async list(params: { status?: string; q?: string; from?: string; to?: string }): Promise<OrderListRow[]> {
    return await this.repo.list(params);
  }

  async detail(orderId: number): Promise<any | null> {
    const out = await this.repo.getOrder(orderId);
    return out || null;
  }
}
