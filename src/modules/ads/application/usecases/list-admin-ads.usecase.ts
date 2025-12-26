import { Injectable } from '@nestjs/common';
import { AdsRepository } from '../../ads.repository.js';
import { AdMapper } from '../mappers/ad.mapper.js';

@Injectable()
export class ListAdminAdsUseCase {
  constructor(private readonly repo: AdsRepository, private readonly mapper: AdMapper) {}

  async execute() {
    const rows = await this.repo.listAdmin();
    return rows.map((a) => this.mapper.toLegacy(a));
  }
}
