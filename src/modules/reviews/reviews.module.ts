import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsRepository } from './reviews.repository.js';
import { ReviewMapper } from './application/mappers/review.mapper.js';
import { ListReviewsUseCase } from './application/usecases/list-reviews.usecase.js';
import { CreateReviewUseCase } from './application/usecases/create-review.usecase.js';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsRepository, ReviewMapper, ListReviewsUseCase, CreateReviewUseCase],
})
export class ReviewsModule {}
