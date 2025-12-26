import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

function parseRange(from?: string, to?: string) {
  // Front envía YYYY-MM-DD sin TZ; lo interpretamos en America/Bogota (-05:00)
  const start = from ? new Date(`${from}T00:00:00-05:00`) : null;
  const end = to ? new Date(`${to}T23:59:59-05:00`) : null;
  return { start, end };
}

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { status?: string; q?: string; from?: string; to?: string }) {
    const { status, q } = params || {};
    const { start, end } = parseRange(params?.from, params?.to);

    const where: any = {};
    if (status) where.status = status;
    if (start || end) {
      where.createdAt = {};
      if (start) where.createdAt.gte = start;
      if (end) where.createdAt.lte = end;
    }
    if (q) {
      const qq = String(q).trim();
      const maybeId = Number(qq);
      where.OR = [
        ...(Number.isFinite(maybeId) ? [{ orderId: maybeId }] : []),
        { payerEmail: { contains: qq, mode: 'insensitive' } },
        { domicilioNombre: { contains: qq, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        orderId: true,
        createdAt: true,
        totalAmount: true,
        status: true,
        payerEmail: true,
        domicilioModo: true,
        domicilioNombre: true,
        domicilioDireccion: true,
        domicilioBarrio: true,
        domicilioCiudad: true,
        domicilioTelefono: true,
        domicilioNota: true,
        fechaDomicilio: true,
        estadoDomicilio: true,
      },
    });

    return rows.map((o) => ({
      order_id: o.orderId,
      created_at: o.createdAt?.toISOString?.() ?? String(o.createdAt),
      total_amount: Number(o.totalAmount),
      status: o.status,
      email: o.payerEmail || '',
      customer: 'Cliente',
      domicilio_modo: o.domicilioModo,
      domicilio_nombre: o.domicilioNombre,
      domicilio_direccion: o.domicilioDireccion,
      domicilio_barrio: o.domicilioBarrio,
      domicilio_ciudad: o.domicilioCiudad,
      domicilio_telefono: o.domicilioTelefono,
      domicilio_nota: o.domicilioNota,
      fecha_domicilio: o.fechaDomicilio ? String(o.fechaDomicilio) : null,
      estado_domicilio: o.estadoDomicilio,
    }));
  }

  async getOrder(orderId: number) {
    const o = await this.prisma.order.findUnique({
      where: { orderId },
      include: { items: { include: { product: true } } },
    });
    if (!o) return null;

    // Compat legacy: objeto order con snake_case
    const order = {
      order_id: o.orderId,
      status: o.status,
      total_amount: Number(o.totalAmount),
      payment_method: o.paymentMethod,
      payment_id: o.paymentId,
      payment_status: o.paymentStatus,
      mp_preference_id: o.mpPreferenceId,
      mp_init_point: o.mpInitPoint,
      payer_email: o.payerEmail,
      created_at: o.createdAt?.toISOString?.() ?? String(o.createdAt),
      updated_at: o.updatedAt?.toISOString?.() ?? String(o.updatedAt),
      domicilio_modo: o.domicilioModo,
      domicilio_nombre: o.domicilioNombre,
      domicilio_direccion: o.domicilioDireccion,
      domicilio_barrio: o.domicilioBarrio,
      domicilio_ciudad: o.domicilioCiudad,
      domicilio_telefono: o.domicilioTelefono,
      domicilio_nota: o.domicilioNota,
      domicilio_costo: o.domicilioCosto ? Number(o.domicilioCosto) : 0,
      fecha_domicilio: o.fechaDomicilio ? String(o.fechaDomicilio) : null,
      estado_domicilio: o.estadoDomicilio,
    };

    const items = o.items.map((it) => ({
      item_id: it.orderItemId,
      order_id: it.orderId,
      product_id: it.productId,
      quantity: it.quantity,
      unit_price: Number(it.unitPrice),
      total_price: Number(it.totalPrice),
      product_name: it.product?.name || null,
      image_url: it.product?.imageUrl || null,
    }));

    return { order, items };
  }
}
