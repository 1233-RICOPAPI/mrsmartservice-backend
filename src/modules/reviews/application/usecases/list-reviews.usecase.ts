import { BadRequestException, Injectable } from '@nestjs/common';
import { ReviewsRepository } from '../../reviews.repository.js';
import { ReviewMapper } from '../mappers/review.mapper.js';

@Injectable()
export class ListReviewsUseCase {
  constructor(private readonly repo: ReviewsRepository, private readonly mapper: ReviewMapper) {}

  async execute(productId: number) {
    if (!Number.isFinite(productId) || productId <= 0) throw new BadRequestException('bad_id');
    const rows = await this.repo.list(productId);
    return rows.map((r) => this.mapper.toLegacy(r));
  }
}
