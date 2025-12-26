import crypto from 'crypto';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import type { Request } from 'express';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
const MP_CURRENCY = process.env.MP_CURRENCY_ID || 'COP';

function safeNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function envBool(v: any, fallback: boolean) {
  if (v === undefined || v === null || v === '') return fallback;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'y';
}

function baseUrlFromReq(req: Request) {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || `localhost:${process.env.PORT || 8080}`;
  return `${proto}://${host}`;
}

function frontBase() {
  const s = String(process.env.FRONT_URL || '').trim().replace(/\/+$/, '');
  if (s) return s;
  return process.env.NODE_ENV === 'production' ? 'https://mrsmartservice-decad.web.app' : 'http://localhost:3000';
}

function normalizeItem(i: any) {
  const productId = Number(i?.product_id ?? i?.productId ?? i?.id);
  const quantity = Math.max(1, Number(i?.quantity ?? 1));
  const title = String(i?.title ?? i?.name ?? `Producto #${productId}`).trim();
  const unit_price = safeNumber(i?.unit_price ?? i?.price);
  return { productId, quantity, title, unit_price };
}

@Injectable()
export class PaymentsService {
  private mp: MercadoPagoConfig | null = null;

  constructor(private readonly prisma: PrismaService) {
    if (process.env.MP_ACCESS_TOKEN) {
      this.mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    } else {
      // No tiramos error aquí para que el API corra, pero las rutas de pago fallarán hasta configurar.
      // eslint-disable-next-line no-console
      console.error('❌ Falta MP_ACCESS_TOKEN en variables de entorno');
    }
  }

  async createPayment(dto: CreatePaymentDto, req: Request) {
    if (!this.mp) throw new BadRequestException({ error: 'mp_not_configured' });

    const itemsIn = Array.isArray(dto?.items) ? dto.items : [];
    if (!itemsIn.length) throw new BadRequestException({ error: 'missing_items' });

    // Resolver precios desde DB cuando falte unit_price
    const normalized = [];
    for (const raw of itemsIn) {
      const n = normalizeItem(raw);
      if (!Number.isFinite(n.productId) || n.productId <= 0) throw new BadRequestException({ error: 'bad_item' });

      let price = n.unit_price;
      if (!Number.isFinite(price) || price <= 0) {
        const p = await this.prisma.product.findUnique({
          where: { productId: n.productId },
          select: { price: true, discountPercent: true, discountStart: true, discountEnd: true },
        });
        if (!p) throw new BadRequestException({ error: 'product_not_found', productId: n.productId });

        price = Number(p.price);
        const discount = Number(p.discountPercent || 0);
        if (discount > 0) {
          let active = true;
          if (p.discountStart && p.discountEnd) {
            const now = new Date();
            const start = new Date(p.discountStart);
            const end = new Date(p.discountEnd);
            active = now >= start && now <= end;
          }
          if (active) price = Math.round(price * (1 - discount / 100));
        }
      }

      normalized.push({
        id: String(n.productId), // requerido por tipos MP
        title: n.title,
        unit_price: Number(price),
        quantity: n.quantity,
        currency_id: MP_CURRENCY,
      });
    }

    // Back URLs al postpago (front)
    const back_urls = {
      success: `${frontBase()}/postpago.html`,
      failure: `${frontBase()}/postpago.html`,
      pending: `${frontBase()}/postpago.html`,
    };

    const pref = new Preference(this.mp);
    const body: any = {
      items: normalized,
      back_urls,
      binary_mode: envBool(process.env.MP_BINARY_MODE, true),
      // notification_url: `${baseUrlFromReq(req)}/api/payments/webhook`, // opcional
    };

    const out = await pref.create({ body });
    const data: any = (out as any) ?? {};
    const response = data.response ?? data;

    return {
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      id: response.id,
      back_urls,
    };
  }

  /**
   * confirmPayment:
   * El front llama con payment_id/status, o con query params de MP.
   * Aquí guardamos la orden + items para que el panel y factura funcionen.
   */
  async confirmPayment(body: any, req: Request) {
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

    // Map items for DB
    const items = itemsIn.map((it: any) => {
      const n = normalizeItem(it);
      const unit = safeNumber(it.unit_price ?? it.price ?? n.unit_price);
      return {
        productId: n.productId,
        quantity: n.quantity,
        unitPrice: unit,
        title: n.title,
      };
    });

    // Compute total if missing
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

      return { ok: true, order_id: created.orderId };
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('❌ Error guardando orden + items:', e);
      throw new InternalServerErrorException({ error: 'order_save_failed' });
    }
  }

  /**
   * Webhook MP:
   * - Mantiene compatibilidad y siempre retorna 200.
   * - Si hay payment id, intenta refrescar status y actualizar orders.
   */
  async handleWebhook(req: Request) {
    try {
      const query: any = req.query || {};
      const body: any = (req as any).body || {};
      const topic = String(query.topic || body.topic || '').toLowerCase();
      const type = String(query.type || body.type || '').toLowerCase();

      const paymentId =
        String(query.id || '').trim() ||
        String(body?.data?.id || '').trim() ||
        String(body?.id || '').trim();

      const isPayment = topic === 'payment' || type === 'payment';

      if (!paymentId || !isPayment || !this.mp) {
        return { ok: true };
      }

      const pay = new Payment(this.mp);
      const out = await pay.get({ id: paymentId });
      const data: any = (out as any)?.response ?? out;
      const status = String(data?.status || '').toUpperCase();

      await this.prisma.order.updateMany({ where: { paymentId }, data: { paymentStatus: status, status } });

      return { ok: true };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Webhook error:', e);
      return { ok: true };
    }
  }
}
