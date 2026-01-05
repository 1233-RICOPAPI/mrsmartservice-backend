import { Module } from '@nestjs/common';
import { LicensesAdminController, LicensesPublicController } from './licenses.controller.js';
import { LicensesService } from './licenses.service.js';
import { LicensesRepository } from './licenses.repository.js';

@Module({
  controllers: [LicensesAdminController, LicensesPublicController],
  providers: [LicensesService, LicensesRepository],
})
export class LicensesModule {}
