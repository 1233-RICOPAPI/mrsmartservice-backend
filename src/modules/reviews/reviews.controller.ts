import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ListReviewsUseCase } from './application/usecases/list-reviews.usecase.js';
import { CreateReviewUseCase } from './application/usecases/create-review.usecase.js';
import { CreateReviewDto } from './dto/create-review.dto.js';

@Controller('api/products/:id/reviews')
export class ReviewsController {
  constructor(
    private readonly listUC: ListReviewsUseCase,
    private readonly createUC: CreateReviewUseCase,
  ) {}

  @Get()
  list(@Param('id') id: string) {
    return this.listUC.execute(Number(id));
  }

  @Post()
  create(@Param('id') id: string, @Body() dto: CreateReviewDto) {
    return this.createUC.execute(Number(id), dto);
  }
}
