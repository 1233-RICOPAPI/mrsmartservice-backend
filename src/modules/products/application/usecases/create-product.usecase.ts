import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateProductDto } from '../../dto/create-product.dto.js';
import { ProductsRepository } from '../../products.repository.js';
import { toLegacyProduct } from '../mappers/product.mapper.js';

@Injectable()
export class CreateProductUseCase {
  constructor(private readonly repo: ProductsRepository) {}

  async execute(dto: CreateProductDto) {
    const name = String(dto?.name || '').trim();
    if (!name) throw new BadRequestException({ error: 'missing_name' });

    const price = Number((dto as any)?.price ?? 0);
    const stock = Number((dto as any)?.stock ?? 0);
    if (!Number.isFinite(price)) throw new BadRequestException({ error: 'bad_price' });
    if (!Number.isFinite(stock)) throw new BadRequestException({ error: 'bad_stock' });

    try {
      const p = await this.repo.create(dto);
      return toLegacyProduct(p);
    } catch {
      throw new InternalServerErrorException({ error: 'product_create_failed' });
    }
  }
}
