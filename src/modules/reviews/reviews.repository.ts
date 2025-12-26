import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(productId: number) {
    return this.prisma.productReview.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      select: { reviewId: true, authorName: true, rating: true, comment: true, createdAt: true },
    });
  }

  create(productId: number, authorName: string, rating: number, comment: string) {
    return this.prisma.productReview.create({
      data: { productId, authorName, rating, comment },
      select: { reviewId: true, authorName: true, rating: true, comment: true, createdAt: true },
    });
  }
}
