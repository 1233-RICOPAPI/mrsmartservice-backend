import { Module } from '@nestjs/common';
import { SoftwaresController } from './softwares.controller.js';
import { SoftwaresRepository } from './softwares.repository.js';
import { ListPublicSoftwaresUseCase } from './application/usecases/list-public-softwares.usecase.js';
import { ListAdminSoftwaresUseCase } from './application/usecases/list-admin-softwares.usecase.js';
import { CreateSoftwareUseCase } from './application/usecases/create-software.usecase.js';
import { UpdateSoftwareUseCase } from './application/usecases/update-software.usecase.js';
import { DeleteSoftwareUseCase } from './application/usecases/delete-software.usecase.js';
import { GetPublicSoftwareByIdUseCase } from './application/usecases/get-public-software-by-id.usecase.js';

@Module({
  controllers: [SoftwaresController],
  providers: [
    SoftwaresRepository,
    ListPublicSoftwaresUseCase,
    GetPublicSoftwareByIdUseCase,
    ListAdminSoftwaresUseCase,
    CreateSoftwareUseCase,
    UpdateSoftwareUseCase,
    DeleteSoftwareUseCase,
  ],
})
export class SoftwaresModule {}
