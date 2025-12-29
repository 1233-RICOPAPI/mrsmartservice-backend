import { Injectable, NotFoundException } from '@nestjs/common';
import { SoftwaresRepository } from '../../softwares.repository.js';

@Injectable()
export class GetPublicSoftwareByIdUseCase {
  constructor(private readonly repo: SoftwaresRepository) {}

  async execute(id: number) {
    const sw = await this.repo.getActiveById(id);
    if (!sw) throw new NotFoundException('software_not_found');
    return sw;
  }
}
