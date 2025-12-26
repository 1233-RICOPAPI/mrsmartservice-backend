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
import { AdsRepository } from './ads.repository.js';
let AdsService = class AdsService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    toLegacy(ad) {
        return {
            ad_id: ad.adId,
            title: ad.title,
            description: ad.description,
            video_url: ad.videoUrl,
            image_url: ad.imageUrl,
            link_url: ad.linkUrl,
            active: ad.active,
            created_at: ad.createdAt,
            updated_at: ad.updatedAt,
        };
    }
    listPublic() {
        return this.repo.listActive().then((rows) => rows.map((a) => this.toLegacy(a)));
    }
    listAdmin() {
        return this.repo.listAdmin().then((rows) => rows.map((a) => this.toLegacy(a)));
    }
    async create(dto) {
        const a = await this.repo.create(dto);
        return this.toLegacy(a);
    }
    async update(id, dto) {
        if (!Number.isFinite(id))
            throw new BadRequestException({ error: 'invalid_id' });
        const a = await this.repo.update(id, dto);
        return a ? this.toLegacy(a) : {};
    }
    async remove(id) {
        if (!Number.isFinite(id))
            throw new BadRequestException({ error: 'invalid_id' });
        await this.repo.remove(id);
        return { ok: true };
    }
};
AdsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [AdsRepository])
], AdsService);
export { AdsService };
//# sourceMappingURL=ads.service.js.map