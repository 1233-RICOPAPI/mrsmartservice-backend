import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService
 * - Single PrismaClient instance via Nest DI
 *
 * IMPORTANT: App runtime uses Prisma typed queries only (no SQL raw).
 * DB schema bootstrap is handled by `npm run db:init` (src/schema.ts).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

}
