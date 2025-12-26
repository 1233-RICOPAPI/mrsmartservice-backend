import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ProductsRepository } from '../../products.repository.js';

@Injectable()
export class DeleteProductUseCase {
  constructor(private readonly repo: ProductsRepository) {}

  async execute(productId: number) {
    if (!Number.isFinite(productId)) throw new BadRequestException({ error: 'invalid_id' });

    try {
      const result: any = await this.repo.hardDelete(productId);
      if (result?.soft_deleted) return { ok: true, deleted: false, softDeleted: true, reason: 'referenced_by_orders' };
      return { ok: true, deleted: true };
    } catch {
      throw new InternalServerErrorException({ error: 'product_delete_failed' });
    }
  }
}
