import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { UpdateProductDto } from '../../dto/update-product.dto.js';
import { ProductsRepository } from '../../products.repository.js';
import { toLegacyProduct } from '../mappers/product.mapper.js';

@Injectable()
export class UpdateProductUseCase {
  constructor(private readonly repo: ProductsRepository) {}

  async execute(productId: number, dto: UpdateProductDto) {
    if (!Number.isFinite(productId)) throw new BadRequestException({ error: 'invalid_id' });

    try {
      const p = await this.repo.update(productId, dto);
      if (!p) throw new BadRequestException({ error: 'no_fields' });
      return toLegacyProduct(p);
    } catch (e: any) {
      if (e?.response?.error === 'no_fields') throw e;
      throw new InternalServerErrorException({ error: 'product_update_failed' });
    }
  }
}
