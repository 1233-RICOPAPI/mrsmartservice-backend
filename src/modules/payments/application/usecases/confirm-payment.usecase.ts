import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import type { Request } from 'express';
import { PrismaService } from '../../../../common/prisma/prisma.service.js';
import { normalizeItem, safeNumber } from '../utils/payments.utils.js';
import { resolveFrontBase } from '../../../auth/application/utils/front-base.js';

function has(v: any) {
  return typeof v === 'string' && v.trim().length > 0;
}

function str(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
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

    // Comprador / factura: soporta body directo o anidado buyer / factura
    const buyer = b.buyer || {};
    const factura = b.factura || {};
    const buyer_name = str(b.buyer_name ?? buyer.name ?? buyer.buyer_name);
    const buyer_email = str(b.buyer_email ?? buyer.email ?? payer_email);
    const buyer_phone = str(b.buyer_phone ?? buyer.phone ?? buyer.telefono);
    const buyer_nit = str(b.buyer_nit ?? factura.nit ?? buyer.nit);
    const buyer_company = str(b.buyer_company ?? factura.razon_social ?? buyer.razon_social ?? buyer.company);

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
            buyerName: buyer_name,
            buyerEmail: buyer_email || payer_email || null,
            buyerPhone: buyer_phone,
            buyerNit: buyer_nit,
            buyerCompany: buyer_company,
            payerEmail: payer_email || buyer_email || null,
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

      // Notificar por email al admin cuando el pago está aprobado (evitar spam: From claro, asunto descriptivo)
      if (status === 'APPROVED') {
        this.sendOrderNotificationToAdmin(Number(orderId)).catch((err) => {
          // eslint-disable-next-line no-console
          console.error('❌ Error enviando notificación de venta por email:', err);
        });
      }

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

  /** Lista de correos admin para notificación de ventas (evitar spam: From claro, asunto descriptivo, replyTo comprador). */
  private getAdminNotificationEmails(): string[] {
    const list: string[] = [];
    const envList = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || process.env.NOTIFY_EMAIL || process.env.SMTP_USER || '';
    for (const e of envList.split(/[,;\s]+/)) {
      const t = e.trim();
      if (t && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) list.push(t);
    }
    list.push('yesfri@hotmail.es', 'aaronmotta5@gmail.com');
    return [...new Set(list)];
  }

  private async sendOrderNotificationToAdmin(orderId: number) {
    const toEmails = this.getAdminNotificationEmails();
    if (!toEmails.length || !has(process.env.SMTP_HOST) || !has(process.env.SMTP_USER) || !has(process.env.SMTP_PASS)) {
      return;
    }

    const order = await this.prisma.order.findUnique({
      where: { orderId },
      include: { items: { include: { product: { select: { name: true } } } } },
    });
    if (!order) return;

    const isDomicilio = String(order.domicilioModo || '').toLowerCase() === 'domicilio';
    const entrega = isDomicilio ? 'Envío a domicilio' : 'Recoge en local';

    const rows = (order.items || []).map((it) => {
      const name = it.product?.name || `Producto #${it.productId}`;
      const unit = Number(it.unitPrice);
      const qty = it.quantity;
      const total = Number(it.totalPrice);
      return `<tr><td>${escapeHtml(name)}</td><td>${unit.toLocaleString('es-CO')}</td><td>${qty}</td><td>${total.toLocaleString('es-CO')}</td></tr>`;
    }).join('');

    const totalGeneral = Number(order.totalAmount);
    const domicilioCosto = Number(order.domicilioCosto || 0);

    let domicilioBlock = '';
    if (isDomicilio && (order.domicilioNombre || order.domicilioDireccion)) {
      domicilioBlock = `
        <p><strong>Datos de entrega:</strong></p>
        <ul>
          <li>Nombre: ${escapeHtml(order.domicilioNombre || '-')}</li>
          <li>Dirección: ${escapeHtml(order.domicilioDireccion || '-')}</li>
          <li>Barrio: ${escapeHtml(order.domicilioBarrio || '-')}</li>
          <li>Ciudad: ${escapeHtml(order.domicilioCiudad || '-')}</li>
          <li>Teléfono: ${escapeHtml(order.domicilioTelefono || '-')}</li>
          ${order.domicilioNota ? `<li>Nota: ${escapeHtml(order.domicilioNota)}</li>` : ''}
        </ul>`;
    }

    const facturaBlock = (order.buyerNit || order.buyerCompany) ? `
      <p><strong>Facturación (solicitada):</strong></p>
      <ul>
        <li>NIT: ${escapeHtml(order.buyerNit || '-')}</li>
        <li>Razón social: ${escapeHtml(order.buyerCompany || '-')}</li>
        <li>Correo: ${escapeHtml(order.buyerEmail || order.payerEmail || '-')}</li>
        <li>Teléfono: ${escapeHtml(order.buyerPhone || '-')}</li>
      </ul>` : '';

    const reminder =
      isDomicilio
        ? '<p style="color:#0f172a;background:#fef3c7;padding:8px 12px;border-radius:10px;"><strong>Acción:</strong> Alista el pedido para envío y coordina con el cliente apenas recibas este correo.</p>'
        : '<p style="color:#0f172a;background:#fef3c7;padding:8px 12px;border-radius:10px;"><strong>Acción:</strong> El cliente puede reclamar en el local dentro de los próximos 4 días hábiles. Ten el producto listo en mostrador.</p>';

    const html = `
      <p>Nueva venta aprobada.</p>
      ${reminder}
      <p><strong>Pedido #${orderId}</strong> | ${entrega}</p>
      <p><strong>Comprador:</strong> ${escapeHtml(order.buyerName || 'N/A')} | ${escapeHtml(order.buyerEmail || order.payerEmail || '')}</p>
      ${domicilioBlock}
      <p><strong>Productos:</strong></p>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
        <thead><tr><th>Producto</th><th>Valor unitario</th><th>Cantidad</th><th>Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${domicilioCosto > 0 ? `<p>Envío: ${domicilioCosto.toLocaleString('es-CO')}</p>` : ''}
      <p><strong>Total general: ${totalGeneral.toLocaleString('es-CO')}</strong></p>
      ${facturaBlock}
    `;

    const plainLines = [
      'Nueva venta aprobada.',
      isDomicilio
        ? 'Acción: Alista el pedido para envío y coordina con el cliente de inmediato.'
        : 'Acción: Cliente recoge en local dentro de 4 días hábiles, prepara el pedido.',
      `Pedido #${orderId} | ${entrega}`,
      `Comprador: ${order.buyerName || 'N/A'} | ${order.buyerEmail || order.payerEmail || ''}`,
    ];
    if (isDomicilio) {
      plainLines.push(
        `Entrega a: ${order.domicilioNombre || '-'}`,
        `Dirección: ${order.domicilioDireccion || '-'}, ${order.domicilioBarrio || ''}, ${order.domicilioCiudad || ''}`,
        `Teléfono: ${order.domicilioTelefono || '-'}`,
        order.domicilioNota ? `Nota: ${order.domicilioNota}` : '',
      );
    }
    if (order.buyerNit || order.buyerCompany) {
      plainLines.push(
        'Factura solicitada:',
        `NIT: ${order.buyerNit || '-'}`,
        `Razón social: ${order.buyerCompany || '-'}`,
        `Correo: ${order.buyerEmail || order.payerEmail || '-'}`,
      );
    }
    plainLines.push('Productos:');
    for (const it of order.items || []) {
      const name = it.product?.name || `Producto #${it.productId}`;
      plainLines.push(
        `- ${name} x${it.quantity} -> ${Number(it.totalPrice).toLocaleString('es-CO')}`,
      );
    }
    if (domicilioCosto > 0) plainLines.push(`Envío: ${domicilioCosto.toLocaleString('es-CO')}`);
    plainLines.push(`Total general: ${totalGeneral.toLocaleString('es-CO')}`);
    const text = plainLines.filter(Boolean).join('\n');

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const from = `"MR SmartService" <${process.env.SMTP_USER}>`;
    const subject = `Nueva venta aprobada #${orderId} - MR SmartService`;
    const replyTo = order.buyerEmail || order.payerEmail || undefined;
    await transporter.sendMail({
      from,
      to: toEmails.join(','),
      replyTo,
      subject,
      text,
      html,
      headers: {
        'X-Priority': '3',
        'X-Mailer': 'MR SmartService',
      },
    });
  }
}

function escapeHtml(s: string | null | undefined): string {
  if (s == null) return '';
  const t = String(s);
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
