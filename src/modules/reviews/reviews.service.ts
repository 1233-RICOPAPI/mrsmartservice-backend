import { BadRequestException, Injectable } from '@nestjs/common';
import { ReviewsRepository } from './reviews.repository.js';

@Injectable()
export class ReviewsService {
  constructor(private readonly repo: ReviewsRepository) {}

  async list(productId: number) {
    if (!Number.isFinite(productId) || productId <= 0) {
      throw new BadRequestException('bad_id');
    }
    const rows = await this.repo.list(productId);
    return rows.map((r) => ({
      review_id: r.reviewId,
      name: r.authorName,
      rating: r.rating,
      comment: r.comment,
      created_at: r.createdAt,
    }));
  }

  async create(productId: number, body: any) {
    if (!Number.isFinite(productId) || productId <= 0) {
      throw new BadRequestException('bad_id');
    }
    const { name, author, rating, comment } = body || {};

    const authorName = String(name || author || '').trim();
    if (!authorName || rating === undefined || rating === null) {
      throw new BadRequestException('missing_fields');
    }
    const r = Math.max(1, Math.min(5, Number(rating)));

    const out = await this.repo.create(productId, authorName, r, String(comment || ''));
    return { review_id: out.reviewId, name: out.authorName, rating: out.rating, comment: out.comment, created_at: out.createdAt };
  }
}
