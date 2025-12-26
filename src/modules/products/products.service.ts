import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductsRepository } from './products.repository.js';

@Injectable()
export class ProductsService {
  constructor(private readonly repo: ProductsRepository) {}

  private toLegacyProduct(p: any) {
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
    };
  }

  async listPublic() {
    try {
      const rows = await this.repo.listPublicRaw();

      const now = new Date();
      return rows.map((product: any) => {
        let discount = Number(product.discount_percent || 0);

        if (product.discount_start && product.discount_end) {
          const start = new Date(product.discount_start);
          const end = new Date(product.discount_end);
          if (now < start || now > end) discount = 0;
        }

        return { ...product, discount_percent: discount };
      });
    } catch (e: any) {
      // Compatibilidad con legacy: si falla DB, devolver []
      return [];
    }
  }

  async create(dto: CreateProductDto) {
    const name = String(dto?.name || '').trim();
    if (!name) throw new BadRequestException({ error: 'missing_name' });

    const price = Number((dto as any)?.price ?? 0);
    const stock = Number((dto as any)?.stock ?? 0);
    if (!Number.isFinite(price)) throw new BadRequestException({ error: 'bad_price' });
    if (!Number.isFinite(stock)) throw new BadRequestException({ error: 'bad_stock' });

    try {
      const p = await this.repo.create(dto);
      return this.toLegacyProduct(p);
    } catch (e) {
      throw new InternalServerErrorException({ error: 'product_create_failed' });
    }
  }

  async update(id: number, dto: UpdateProductDto) {
    if (!Number.isFinite(id)) throw new BadRequestException({ error: 'invalid_id' });

    try {
      const p = await this.repo.update(id, dto);
      if (!p) throw new BadRequestException({ error: 'no_fields' });
      return this.toLegacyProduct(p);
    } catch (e: any) {
      if (e?.response?.error === 'no_fields') throw e;
      throw new InternalServerErrorException({ error: 'product_update_failed' });
    }
  }

  async remove(id: number) {
    if (!Number.isFinite(id)) throw new BadRequestException({ error: 'invalid_id' });

    try {
      const result: any = await this.repo.hardDelete(id);
      if (result?.soft_deleted) return { ok: true, deleted: false, softDeleted: true, reason: 'referenced_by_orders' };
      return { ok: true, deleted: true };
    } catch {
      throw new InternalServerErrorException({ error: 'product_delete_failed' });
    }
  }
}
