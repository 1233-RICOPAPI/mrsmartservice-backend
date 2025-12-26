var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
let AdsRepository = class AdsRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    listActive() {
        return this.prisma.ad.findMany({ where: { active: true }, orderBy: { adId: 'desc' } });
    }
    listAdmin() {
        return this.prisma.ad.findMany({ orderBy: { adId: 'desc' } });
    }
    create(dto) {
        return this.prisma.ad.create({
            data: {
                title: dto.title || null,
                imageUrl: dto.image_url || null,
                linkUrl: dto.link_url || null,
                active: dto.active ?? true,
                description: dto.description || null,
                videoUrl: dto.video_url || null,
            },
        });
    }
    async update(id, dto) {
        const data = {};
        if (dto.title !== undefined)
            data.title = dto.title;
        if (dto.image_url !== undefined)
            data.imageUrl = dto.image_url;
        if (dto.link_url !== undefined)
            data.linkUrl = dto.link_url;
        if (dto.active !== undefined)
            data.active = dto.active;
        if (dto.description !== undefined)
            data.description = dto.description;
        if (dto.video_url !== undefined)
            data.videoUrl = dto.video_url;
        if (!Object.keys(data).length)
            return null;
        return this.prisma.ad.update({ where: { adId: id }, data });
    }
    remove(id) {
        return this.prisma.ad.delete({ where: { adId: id } });
    }
};
AdsRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], AdsRepository);
export { AdsRepository };
//# sourceMappingURL=ads.repository.js.map