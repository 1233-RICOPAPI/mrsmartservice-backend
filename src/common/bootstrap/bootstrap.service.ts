import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  // Nota: inyección explícita para evitar problemas de metadata en runtimes TS.
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  async onApplicationBootstrap() {
    // Seed admin/dev (rápido). En tests ayuda a que el admin exista antes del login.
    await this.seedAdminOnce().catch((e: any) =>
      console.error('❌ Error en seedAdminOnce:', e?.message || e),
    );
  }

  private async seedAdminOnce() {
    const anyDb: any = this.db as any;
    if (!anyDb.user?.upsert) {
      console.warn('⚠️ seedAdminOnce skipped: PrismaClient sin modelo User (prisma generate pendiente)');
      return;
    }

    const adminEmail = 'admin@tienda.com';
    const adminPass = 'Admin12345!';
    const devEmail = 'dev@tienda.com';
    const devPass = 'Dev12345!';

    const adminHash = bcrypt.hashSync(adminPass, 10);
    const devHash = bcrypt.hashSync(devPass, 10);

    await this.db.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: { email: adminEmail, passwordHash: adminHash, role: 'ADMIN' },
    });

    await this.db.user.upsert({
      where: { email: devEmail },
      update: {},
      create: { email: devEmail, passwordHash: devHash, role: 'DEV_ADMIN' },
    });

    console.log('✅ Seed usuarios listo (creados si no existían):');
    console.log('   Admin:', adminEmail);
    console.log('   Dev:  ', devEmail);
  }
}
