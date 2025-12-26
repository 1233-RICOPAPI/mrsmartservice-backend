import { Injectable, BadRequestException } from '@nestjs/common';
import { AdsRepository } from '../../ads.repository.js';
import { UpdateAdDto } from '../../dto/update-ad.dto.js';
import { AdMapper } from '../mappers/ad.mapper.js';

@Injectable()
export class UpdateAdUseCase {
  constructor(private readonly repo: AdsRepository, private readonly mapper: AdMapper) {}

  async execute(id: number, dto: UpdateAdDto) {
    if (!Number.isFinite(id) || id <= 0) throw new BadRequestException('bad_id');
    const updated = await this.repo.update(id, dto);
    return this.mapper.toLegacy(updated);
  }
}
