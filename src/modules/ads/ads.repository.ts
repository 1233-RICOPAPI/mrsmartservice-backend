import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreateAdDto } from './dto/create-ad.dto.js';
import { UpdateAdDto } from './dto/update-ad.dto.js';

@Injectable()
export class AdsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listActive() {
    return this.prisma.ad.findMany({ where: { active: true }, orderBy: { adId: 'desc' } });
  }

  listAdmin() {
    return this.prisma.ad.findMany({ orderBy: { adId: 'desc' } });
  }

  create(dto: CreateAdDto) {
    return this.prisma.ad.create({
      data: {
        title: dto.title || null,
        imageUrl: (dto as any).image_url || null,
        linkUrl: (dto as any).link_url || null,
        active: (dto as any).active ?? true,
        description: (dto as any).description || null,
        videoUrl: (dto as any).video_url || null,
      },
    });
  }

  async update(id: number, dto: UpdateAdDto) {
    const data: any = {};
    if ((dto as any).title !== undefined) data.title = (dto as any).title;
    if ((dto as any).image_url !== undefined) data.imageUrl = (dto as any).image_url;
    if ((dto as any).link_url !== undefined) data.linkUrl = (dto as any).link_url;
    if ((dto as any).active !== undefined) data.active = (dto as any).active;
    if ((dto as any).description !== undefined) data.description = (dto as any).description;
    if ((dto as any).video_url !== undefined) data.videoUrl = (dto as any).video_url;
    if (!Object.keys(data).length) return null;
    return this.prisma.ad.update({ where: { adId: id }, data });
  }

  remove(id: number) {
    return this.prisma.ad.delete({ where: { adId: id } });
  }
}
