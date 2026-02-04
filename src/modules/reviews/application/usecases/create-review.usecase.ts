import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { ReviewsRepository } from '../../reviews.repository.js';
import { ReviewMapper } from '../mappers/review.mapper.js';
import { CreateReviewDto } from '../../dto/create-review.dto.js';

function visitorKeyFrom(ip: string, deviceId: string): string {
  const raw = `${(ip || '').trim()}|${(deviceId || '').trim()}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 64);
}

@Injectable()
export class CreateReviewUseCase {
  constructor(private readonly repo: ReviewsRepository, private readonly mapper: ReviewMapper) {}

  async execute(productId: number, dto: CreateReviewDto, clientIp: string) {
    if (!Number.isFinite(productId) || productId <= 0) throw new BadRequestException('bad_id');
    const name = (dto.name || dto.author || 'Anónimo').toString().slice(0, 120);
    const rating = Number(dto.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new BadRequestException('bad_rating');
    const comment = (dto.comment || '').toString().slice(0, 1000);

    const deviceId = (dto.device_id || '').toString().trim();
    const visitorKey = deviceId ? visitorKeyFrom(clientIp, deviceId) : null;

    if (visitorKey) {
      const existing = await this.repo.findByProductAndVisitor(productId, visitorKey);
      if (existing) {
        throw new ConflictException({
          error: 'already_reviewed',
          message: 'Ya has dejado una opinión para este producto. Solo se permite una calificación por producto.',
        });
      }
    }

    const created = await this.repo.create(productId, name, rating, comment, visitorKey);
    return this.mapper.toLegacy(created);
  }
}
