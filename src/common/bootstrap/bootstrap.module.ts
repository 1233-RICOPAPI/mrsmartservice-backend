import { Global, Module } from '@nestjs/common';
import { BootstrapService } from './bootstrap.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [BootstrapService],
})
export class BootstrapModule {}
