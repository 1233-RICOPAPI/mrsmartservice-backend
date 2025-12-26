var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service.js';
import { MpClientService } from '../../infrastructure/mp-client.service.js';
import { envBool, frontBase, MP_CURRENCY, normalizeItem } from '../utils/payments.utils.js';
let CreatePreferenceUseCase = class CreatePreferenceUseCase {
    prisma;
    mp;
    constructor(prisma, mp) {
        this.prisma = prisma;
        this.mp = mp;
    }
    async execute(dto, req) {
        const itemsIn = Array.isArray(dto?.items) ? dto.items : [];
        if (!itemsIn.length)
            throw new BadRequestException({ error: 'missing_items' });
        const normalized = [];
        for (const raw of itemsIn) {
            const n = normalizeItem(raw);
            if (!Number.isFinite(n.productId) || n.productId <= 0)
                throw new BadRequestException({ error: 'bad_item' });
            let price = n.unit_price;
            if (!Number.isFinite(price) || price <= 0) {
                const p = await this.prisma.product.findUnique({
                    where: { productId: n.productId },
                    select: { price: true, discountPercent: true, discountStart: true, discountEnd: true },
                });
                if (!p)
                    throw new BadRequestException({ error: 'product_not_found', productId: n.productId });
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
                    if (active)
                        price = Math.round(price * (1 - discount / 100));
                }
            }
            normalized.push({
                id: String(n.productId),
                title: n.title,
                unit_price: Number(price),
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
        const body = {
            items: normalized,
            back_urls,
            binary_mode: envBool(process.env.MP_BINARY_MODE, true),
        };
        const out = await pref.create({ body });
        const data = out ?? {};
        const response = data.response ?? data;
        return {
            init_point: response.init_point,
            sandbox_init_point: response.sandbox_init_point,
            id: response.id,
            back_urls,
        };
    }
};
CreatePreferenceUseCase = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService, MpClientService])
], CreatePreferenceUseCase);
export { CreatePreferenceUseCase };
//# sourceMappingURL=create-preference.usecase.js.map