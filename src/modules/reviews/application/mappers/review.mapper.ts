import { Injectable } from '@nestjs/common';

@Injectable()
export class ReviewMapper {
  toLegacy(r: any) {
    return {
      review_id: r.reviewId,
      name: r.authorName,
      rating: r.rating,
      comment: r.comment,
      created_at: r.createdAt,
    };
  }
}
