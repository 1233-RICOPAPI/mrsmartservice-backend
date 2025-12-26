import { BadRequestException, Injectable } from '@nestjs/common';
import { ReviewsRepository } from '../../reviews.repository.js';
import { ReviewMapper } from '../mappers/review.mapper.js';
import { CreateReviewDto } from '../../dto/create-review.dto.js';

@Injectable()
export class CreateReviewUseCase {
  constructor(private readonly repo: ReviewsRepository, private readonly mapper: ReviewMapper) {}

  async execute(productId: number, dto: CreateReviewDto) {
    if (!Number.isFinite(productId) || productId <= 0) throw new BadRequestException('bad_id');
    const name = (dto.name || dto.author || 'Anónimo').toString().slice(0, 120);
    const rating = Number(dto.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new BadRequestException('bad_rating');
    const comment = (dto.comment || '').toString().slice(0, 1000);

    const created = await this.repo.create(productId, name, rating, comment);
    return this.mapper.toLegacy(created);
  }
}
