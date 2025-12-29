import { Injectable } from '@nestjs/common';
import { SoftwaresRepository } from '../../softwares.repository.js';
import { CreateSoftwareDto } from '../../dto/create-software.dto.js';

@Injectable()
export class CreateSoftwareUseCase {
  constructor(private readonly repo: SoftwaresRepository) {}
  execute(dto: CreateSoftwareDto) {
    return this.repo.create(dto);
  }
}
