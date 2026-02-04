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

  /** Crea o actualiza solo el usuario contador. Útil si el seed al arranque falló. */
  async seedContadorOnce(): Promise<{ ok: boolean; email: string; userId?: number; error?: string }> {
    const anyDb: any = this.db as any;
    if (!anyDb.user?.upsert) {
      return { ok: false, email: 'contador@tienda.com', error: 'prisma_user_not_available' };
    }
    const contadorEmail = 'contador@tienda.com';
    const contadorPass = 'Contador123!';
    const contadorHash = bcrypt.hashSync(contadorPass, 10);
    await this.db.user.upsert({
      where: { email: contadorEmail },
      update: { passwordHash: contadorHash },
      create: { email: contadorEmail, passwordHash: contadorHash, role: 'CONTADOR' },
    });
    const contador = await this.db.user.findFirst({
      where: { role: 'CONTADOR' },
      select: { userId: true, email: true },
    });
    return { ok: true, email: contadorEmail, userId: contador?.userId };
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
    const contadorEmail = 'contador@tienda.com';
    const contadorPass = 'Contador123!';

    const adminHash = bcrypt.hashSync(adminPass, 10);
    const devHash = bcrypt.hashSync(devPass, 10);
    const contadorHash = bcrypt.hashSync(contadorPass, 10);

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

    await this.db.user.upsert({
      where: { email: contadorEmail },
      update: { passwordHash: contadorHash },
      create: { email: contadorEmail, passwordHash: contadorHash, role: 'CONTADOR' },
    });

    const contador = await this.db.user.findFirst({ where: { role: 'CONTADOR' }, select: { userId: true, email: true } });
    console.log('✅ Seed usuarios listo (creados/actualizados):');
    console.log('   Admin:', adminEmail);
    console.log('   Dev:  ', devEmail);
    console.log('   Contador:', contadorEmail, contador ? `(userId=${contador.userId})` : '(no encontrado)');
  }
}
