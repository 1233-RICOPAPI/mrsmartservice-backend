import { BadRequestException, Injectable } from '@nestjs/common';
import { AdsRepository } from './ads.repository.js';
import { CreateAdDto } from './dto/create-ad.dto.js';
import { UpdateAdDto } from './dto/update-ad.dto.js';

@Injectable()
export class AdsService {
  constructor(private readonly repo: AdsRepository) {}

  private toLegacy(ad: any) {
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

  async create(dto: CreateAdDto) {
    const a = await this.repo.create(dto);
    return this.toLegacy(a);
  }

  async update(id: number, dto: UpdateAdDto) {
    if (!Number.isFinite(id)) throw new BadRequestException({ error: 'invalid_id' });
    const a = await this.repo.update(id, dto);
    return a ? this.toLegacy(a) : {};
  }

  async remove(id: number) {
    if (!Number.isFinite(id)) throw new BadRequestException({ error: 'invalid_id' });
    await this.repo.remove(id);
    return { ok: true };
  }
}
