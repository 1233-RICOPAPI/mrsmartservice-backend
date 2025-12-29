import { Injectable } from '@nestjs/common';
import { SoftwaresRepository } from '../../softwares.repository.js';

@Injectable()
export class DeleteSoftwareUseCase {
  constructor(private readonly repo: SoftwaresRepository) {}
  execute(id: number) {
    return this.repo.remove(id);
  }
}
