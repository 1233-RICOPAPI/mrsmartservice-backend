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

  findByProductAndVisitor(productId: number, visitorKey: string) {
    return this.prisma.productReview.findFirst({
      where: { productId, visitorKey },
    });
  }

  create(productId: number, authorName: string, rating: number, comment: string, visitorKey?: string | null) {
    return this.prisma.productReview.create({
      data: { productId, authorName, rating, comment, visitorKey: visitorKey ?? undefined },
      select: { reviewId: true, authorName: true, rating: true, comment: true, createdAt: true },
    });
  }
}
