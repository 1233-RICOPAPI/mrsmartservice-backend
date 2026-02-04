import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ListReviewsUseCase } from './application/usecases/list-reviews.usecase.js';
import { CreateReviewUseCase } from './application/usecases/create-review.usecase.js';
import { CreateReviewDto } from './dto/create-review.dto.js';

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded) && forwarded[0]) return String(forwarded[0]).trim();
  return req.ip || req.socket?.remoteAddress || '';
}

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
  create(@Param('id') id: string, @Body() dto: CreateReviewDto, @Req() req: Request) {
    const clientIp = getClientIp(req);
    return this.createUC.execute(Number(id), dto, clientIp);
  }
}
