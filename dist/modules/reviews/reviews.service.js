var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BadRequestException, Injectable } from '@nestjs/common';
import { ReviewsRepository } from './reviews.repository.js';
let ReviewsService = class ReviewsService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async list(productId) {
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
    async create(productId, body) {
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
};
ReviewsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ReviewsRepository])
], ReviewsService);
export { ReviewsService };
//# sourceMappingURL=reviews.service.js.map