import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

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

    const stats = new Map<number, { avg_rating: number; review_count: number }>();
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

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: String(dto?.name || '').trim(),
        price: String((dto as any)?.price ?? 0) as any,
        stock: Number((dto as any)?.stock ?? 0),
        discountPercent: Number(dto.discount_percent || 0),
        imageUrl: dto.image_url || null,
        videoUrl: dto.video_url || null,
        category: dto.category || null,
        description: dto.description || null,
        techSheet: dto.tech_sheet || null,
        discountStart: (dto.discount_start as any) || null,
        discountEnd: (dto.discount_end as any) || null,
        active: (dto as any)?.active ?? true,
      },
    });
  }

  update(id: number, dto: UpdateProductDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if ((dto as any).price !== undefined) data.price = String((dto as any).price);
    if ((dto as any).stock !== undefined) data.stock = Number((dto as any).stock);
    if (dto.discount_percent !== undefined) data.discountPercent = Number(dto.discount_percent);
    if (dto.image_url !== undefined) data.imageUrl = dto.image_url;
    if (dto.video_url !== undefined) data.videoUrl = dto.video_url;
    if (dto.category !== undefined) data.category = dto.category;
    if ((dto as any).active !== undefined) data.active = (dto as any).active;
    if ((dto as any).discount_start !== undefined) data.discountStart = (dto as any).discount_start;
    if ((dto as any).discount_end !== undefined) data.discountEnd = (dto as any).discount_end;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.tech_sheet !== undefined) data.techSheet = dto.tech_sheet;

    if (!Object.keys(data).length) return null;

    return this.prisma.product.update({ where: { productId: id }, data });
  }

  async hardDelete(id: number) {
    // Si el producto está referenciado por order_items, hacemos soft delete para no romper la integridad
    const refs = await this.prisma.orderItem.count({ where: { productId: id } });
    if (refs > 0) {
      await this.prisma.product.update({ where: { productId: id }, data: { active: false } });
      return { product_id: id, soft_deleted: true };
    }
    const deleted = await this.prisma.product.delete({ where: { productId: id }, select: { productId: true } });
    return { product_id: deleted.productId };
  }

  async softDelete(id: number) {
    await this.prisma.product.update({ where: { productId: id }, data: { active: false } });
    return { ok: true };
  }
}
