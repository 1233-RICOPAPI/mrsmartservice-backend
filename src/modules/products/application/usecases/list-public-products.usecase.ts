import { Injectable } from '@nestjs/common';
import { ProductsRepository } from '../../products.repository.js';

@Injectable()
export class ListPublicProductsUseCase {
  constructor(private readonly repo: ProductsRepository) {}

  async execute() {
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
    } catch {
      return [];
    }
  }
}