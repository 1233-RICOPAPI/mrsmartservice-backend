import { Module } from '@nestjs/common';
import { SoftwareCredentialsRepository } from '../software-credentials/software-credentials.repository.js';
import { SoftwareAuthController } from './software-auth.controller.js';
import { SoftwareAuthService } from './software-auth.service.js';

@Module({
  controllers: [SoftwareAuthController],
  providers: [SoftwareAuthService, SoftwareCredentialsRepository],
})
export class SoftwareAuthModule {}
