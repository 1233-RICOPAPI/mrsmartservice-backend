import { Module } from '@nestjs/common';
import { SoftwareCredentialsController } from './software-credentials.controller.js';
import { CustomerCredentialsController } from './customer-credentials.controller.js';
import { SoftwareCredentialsService } from './software-credentials.service.js';
import { SoftwareCredentialsRepository } from './software-credentials.repository.js';

@Module({
  controllers: [SoftwareCredentialsController, CustomerCredentialsController],
  providers: [SoftwareCredentialsService, SoftwareCredentialsRepository],
})
export class SoftwareCredentialsModule {}
