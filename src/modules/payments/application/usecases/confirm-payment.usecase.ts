import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import crypto from 'crypto';
import type { Request } from 'express';
import { PrismaService } from '../../../../common/prisma/prisma.service.js';
import { normalizeItem, safeNumber } from '../utils/payments.utils.js';
import { resolveFrontBase } from '../../../auth/application/utils/front-base.js';

function has(v: any) {
  return typeof v === 'string' && v.trim().length > 0;
}

// Token público para consumir /api/invoices/:orderId?token=...
function createInvoiceToken(orderId: number, ttlSeconds = 7 * 24 * 3600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${orderId}.${exp}`;
  const secret = has(process.env.JWT_SECRET) ? process.env.JWT_SECRET! : 'dev';
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

@Injectable()
export class ConfirmPaymentUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(body: any, req: Request) {
    const b = body || {};
    const itemsIn = Array.isArray(b.items) ? b.items : Array.isArray(b.cart) ? b.cart : [];
    if (!itemsIn.length) throw new BadRequestException({ error: 'missing_items' });

    const status = String(b.status || b.payment_status || '').toUpperCase();
    const paymentId = String(b.payment_id || b.paymentId || b.id || '').trim();

    const payer_email = String(b.email || b.payer_email || '').trim();
    const total_amount = safeNumber(b.total || b.total_amount);

    const shipping = b.shipping || {};
    const domicilio_modo = shipping?.mode ?? null;
    const domicilio_nombre = shipping?.nombre ?? null;
    const domicilio_direccion = shipping?.direccion ?? null;
    const domicilio_barrio = shipping?.barrio ?? null;
    const domicilio_ciudad = shipping?.ciudad ?? null;
    const domicilio_telefono = shipping?.telefono ?? null;
    const domicilio_nota = shipping?.nota ?? null;
    const domicilio_costo = safeNumber(shipping?.shipping_cost ?? shipping?.domicilio_costo ?? 0);

    const items = itemsIn.map((it: any) => {
      const n = normalizeItem(it);
      const unit = safeNumber(it.unit_price ?? it.price ?? n.unit_price);
      return { productId: n.productId, quantity: n.quantity, unitPrice: unit, title: n.title };
    });

    const computedTotal = items.reduce((acc, it) => acc + Number(it.unitPrice) * Number(it.quantity), 0) + domicilio_costo;
    const finalTotal = Number.isFinite(total_amount) && total_amount > 0 ? total_amount : computedTotal;

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const o = await tx.order.create({
          data: {
            payerEmail: payer_email || null,
            totalAmount: String(finalTotal) as any,
            status: status || 'PENDING',
            paymentId: paymentId || null,
            paymentStatus: status || null,
            domicilioModo: domicilio_modo,
            domicilioNombre: domicilio_nombre,
            domicilioDireccion: domicilio_direccion,
            domicilioBarrio: domicilio_barrio,
            domicilioCiudad: domicilio_ciudad,
            domicilioTelefono: domicilio_telefono,
            domicilioNota: domicilio_nota,
            domicilioCosto: String(domicilio_costo) as any,
          },
          select: { orderId: true },
        });

        await tx.orderItem.createMany({
          data: items.map((it) => ({
            orderId: o.orderId,
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: String(it.unitPrice) as any,
            totalPrice: String(Number(it.unitPrice) * Number(it.quantity)) as any,
          })),
        });

        return o;
      });

      const orderId = created.orderId;
      const token = createInvoiceToken(Number(orderId));
      const front = resolveFrontBase().replace(/\/+$/, '');
      const invoice_url = `${front}/factura.html?order_id=${encodeURIComponent(String(orderId))}&token=${encodeURIComponent(token)}`;

      return {
        ok: true,
        order_id: orderId,
        status: status || 'PENDING',
        invoice_url,
      };
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('❌ Error guardando orden + items:', e);
      throw new InternalServerErrorException({ error: 'order_save_failed' });
    }
  }
}
