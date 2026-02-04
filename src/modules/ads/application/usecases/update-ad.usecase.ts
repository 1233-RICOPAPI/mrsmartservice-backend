import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AdsRepository } from '../../ads.repository.js';
import { UpdateAdDto } from '../../dto/update-ad.dto.js';
import { AdMapper } from '../mappers/ad.mapper.js';

@Injectable()
export class UpdateAdUseCase {
  constructor(private readonly repo: AdsRepository, private readonly mapper: AdMapper) {}

  async execute(id: number, dto: UpdateAdDto) {
    if (!Number.isFinite(id) || id <= 0) throw new BadRequestException('bad_id');
    try {
      const updated = await this.repo.update(id, dto);
      if (updated) return this.mapper.toLegacy(updated);
      const existing = await this.repo.findById(id);
      if (!existing) throw new NotFoundException('ad_not_found');
      return this.mapper.toLegacy(existing);
    } catch (e: any) {
      if (e instanceof NotFoundException) throw e;
      if (e?.code === 'P2025') throw new NotFoundException('ad_not_found');
      throw e;
    }
  }
}
