import { BadRequestException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../../../common/prisma/prisma.service.js';
import { MpClientService } from '../../infrastructure/mp-client.service.js';
import { CreatePaymentDto } from '../../dto/create-payment.dto.js';
import { envBool, frontBase, MP_CURRENCY, normalizeItem } from '../utils/payments.utils.js';

@Injectable()
export class CreatePreferenceUseCase {
  constructor(private readonly prisma: PrismaService, private readonly mp: MpClientService) {}

  async execute(dto: CreatePaymentDto, req: Request) {
    const itemsIn = Array.isArray(dto?.items) ? dto.items : [];
    if (!itemsIn.length) throw new BadRequestException({ error: 'missing_items' });

    const roundPrice = (v: number) => {
      // MercadoPago expects integer amounts for some currencies (e.g. COP).
      if (MP_CURRENCY === 'COP') return Math.round(v);
      return Math.round(v * 100) / 100;
    };

    const normalized: any[] = [];
    for (const raw of itemsIn) {
      const n = normalizeItem(raw);
      // Allow a special non-product line item for shipping.
      // Frontend may send something like { type:'shipping', product_id:'SHIP', unit_price: 5000, quantity:1 }.
      if (n.isShipping) {
        const shipPrice = roundPrice(Number(n.unit_price));
        if (!Number.isFinite(shipPrice) || shipPrice <= 0) {
          throw new BadRequestException({ error: 'bad_item' });
        }
        normalized.push({
          id: 'SHIP',
          title: n.title || 'Envío',
          unit_price: shipPrice,
          quantity: n.quantity,
          currency_id: MP_CURRENCY,
        });
        continue;
      }

      // If we have a numeric productId, we can enrich/validate data from DB.
      if (Number.isFinite(n.productId) && (n.productId as number) > 0) {
        const productId = n.productId as number;
        let price = n.unit_price;
        let title = n.title;

        if (!Number.isFinite(price) || price <= 0 || !title) {
          const p = await this.prisma.product.findUnique({
            where: { productId },
            select: { name: true, price: true, discountPercent: true, discountStart: true, discountEnd: true },
          });
          if (!p) throw new BadRequestException({ error: 'product_not_found', productId });

          title = title || p.name || 'Producto';

          if (!Number.isFinite(price) || price <= 0) {
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
        }

        price = roundPrice(Number(price));
        if (!Number.isFinite(price) || price <= 0) throw new BadRequestException({ error: 'bad_item' });

        normalized.push({
          id: String(productId),
          title,
          unit_price: price,
          quantity: n.quantity,
          currency_id: MP_CURRENCY,
        });
        continue;
      }

      // Fallback: allow items without a productId (e.g. old localStorage carts)
      // as long as title + unit_price are valid.
      const fallbackPrice = roundPrice(Number(n.unit_price));
      if (!n.title || !Number.isFinite(fallbackPrice) || fallbackPrice <= 0) {
        throw new BadRequestException({ error: 'bad_item' });
      }

      normalized.push({
        id: `CUSTOM:${String(n.title).slice(0, 32)}`,
        title: n.title,
        unit_price: fallbackPrice,
        quantity: n.quantity,
        currency_id: MP_CURRENCY,
      });
    }

    const back_urls = {
      success: `${frontBase()}/postpago.html`,
      failure: `${frontBase()}/postpago.html`,
      pending: `${frontBase()}/postpago.html`,
    };

    const pref = this.mp.preference();
    const body: any = {
      items: normalized,
      back_urls,
      binary_mode: envBool(process.env.MP_BINARY_MODE, true),
      // ✅ Solo retornar automáticamente al éxito
      auto_return: 'approved',
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
}