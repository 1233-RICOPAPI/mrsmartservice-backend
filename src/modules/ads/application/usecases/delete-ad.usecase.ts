import { Injectable, BadRequestException } from '@nestjs/common';
import { AdsRepository } from '../../ads.repository.js';

@Injectable()
export class DeleteAdUseCase {
  constructor(private readonly repo: AdsRepository) {}

  async execute(id: number) {
    if (!Number.isFinite(id) || id <= 0) throw new BadRequestException('bad_id');
    await this.repo.remove(id);
    return { success: true };
  }
}
