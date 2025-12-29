import { Injectable } from '@nestjs/common';
import { SoftwaresRepository } from '../../softwares.repository.js';

@Injectable()
export class ListAdminSoftwaresUseCase {
  constructor(private readonly repo: SoftwaresRepository) {}
  execute() {
    return this.repo.listAdmin();
  }
}
