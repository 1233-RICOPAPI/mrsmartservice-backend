import { Injectable } from '@nestjs/common';
import { SoftwaresRepository } from '../../softwares.repository.js';
import { UpdateSoftwareDto } from '../../dto/update-software.dto.js';

@Injectable()
export class UpdateSoftwareUseCase {
  constructor(private readonly repo: SoftwaresRepository) {}
  execute(id: number, dto: UpdateSoftwareDto) {
    return this.repo.update(id, dto);
  }
}
