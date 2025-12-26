var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
let ProductsRepository = class ProductsRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listPublicRaw() {
        const [products, reviewAgg] = await Promise.all([
            this.prisma.product.findMany({
                where: { active: true },
                orderBy: { productId: 'desc' },
            }),
            this.prisma.productReview.groupBy({
                by: ['productId'],
                _avg: { rating: true },
                _count: { _all: true },
            }),
        ]);
        const stats = new Map();
        for (const r of reviewAgg) {
            stats.set(r.productId, {
                avg_rating: Number(r._avg.rating || 0),
                review_count: Number(r._count._all || 0),
            });
        }
        // compat legacy: devolvemos objetos estilo SQL (snake_case) + avg_rating/review_count
        return products.map((p) => {
            const s = stats.get(p.productId) || { avg_rating: 0, review_count: 0 };
            return {
                product_id: p.productId,
                name: p.name,
                description: p.description,
                tech_sheet: p.techSheet,
                price: Number(p.price),
                stock: p.stock,
                discount_percent: p.discountPercent,
                category: p.category,
                image_url: p.imageUrl,
                video_url: p.videoUrl,
                active: p.active,
                discount_start: p.discountStart,
                discount_end: p.discountEnd,
                created_at: p.createdAt,
                updated_at: p.updatedAt,
                avg_rating: s.avg_rating,
                review_count: s.review_count,
            };
        });
    }
    create(dto) {
        return this.prisma.product.create({
            data: {
                name: String(dto?.name || '').trim(),
                price: String(dto?.price ?? 0),
                stock: Number(dto?.stock ?? 0),
                discountPercent: Number(dto.discount_percent || 0),
                imageUrl: dto.image_url || null,
                videoUrl: dto.video_url || null,
                category: dto.category || null,
                description: dto.description || null,
                techSheet: dto.tech_sheet || null,
                discountStart: dto.discount_start || null,
                discountEnd: dto.discount_end || null,
                active: dto?.active ?? true,
            },
        });
    }
    update(id, dto) {
        const data = {};
        if (dto.name !== undefined)
            data.name = dto.name;
        if (dto.price !== undefined)
            data.price = String(dto.price);
        if (dto.stock !== undefined)
            data.stock = Number(dto.stock);
        if (dto.discount_percent !== undefined)
            data.discountPercent = Number(dto.discount_percent);
        if (dto.image_url !== undefined)
            data.imageUrl = dto.image_url;
        if (dto.video_url !== undefined)
            data.videoUrl = dto.video_url;
        if (dto.category !== undefined)
            data.category = dto.category;
        if (dto.active !== undefined)
            data.active = dto.active;
        if (dto.discount_start !== undefined)
            data.discountStart = dto.discount_start;
        if (dto.discount_end !== undefined)
            data.discountEnd = dto.discount_end;
        if (dto.description !== undefined)
            data.description = dto.description;
        if (dto.tech_sheet !== undefined)
            data.techSheet = dto.tech_sheet;
        if (!Object.keys(data).length)
            return null;
        return this.prisma.product.update({ where: { productId: id }, data });
    }
    async hardDelete(id) {
        // Si el producto está referenciado por order_items, hacemos soft delete para no romper la integridad
        const refs = await this.prisma.orderItem.count({ where: { productId: id } });
        if (refs > 0) {
            await this.prisma.product.update({ where: { productId: id }, data: { active: false } });
            return { product_id: id, soft_deleted: true };
        }
        const deleted = await this.prisma.product.delete({ where: { productId: id }, select: { productId: true } });
        return { product_id: deleted.productId };
    }
    async softDelete(id) {
        await this.prisma.product.update({ where: { productId: id }, data: { active: false } });
        return { ok: true };
    }
};
ProductsRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], ProductsRepository);
export { ProductsRepository };
//# sourceMappingURL=products.repository.js.map