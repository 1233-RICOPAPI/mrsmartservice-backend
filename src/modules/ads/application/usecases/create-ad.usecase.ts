import { Injectable } from '@nestjs/common';
import { AdsRepository } from '../../ads.repository.js';
import { CreateAdDto } from '../../dto/create-ad.dto.js';
import { AdMapper } from '../mappers/ad.mapper.js';

@Injectable()
export class CreateAdUseCase {
  constructor(private readonly repo: AdsRepository, private readonly mapper: AdMapper) {}

  async execute(dto: CreateAdDto) {
    const created = await this.repo.create(dto);
    return this.mapper.toLegacy(created);
  }
}
