import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class SoftwareCredentialsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // NOTE: In some dev setups the generated @prisma/client typings can lag behind
  // the current schema (until `prisma generate` runs). We access the model via
  // `any` to avoid TS compile failures.

  async list(params: { softwareId?: number }) {
    const where: any = {};
    if (params?.softwareId) where.softwareId = params.softwareId;

    const rows = await (this.prisma as any).softwareCredential.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        credentialId: true,
        softwareId: true,
        orderId: true,
        username: true,
        createdAt: true,
      },
    });

    return rows.map((r) => ({
      credential_id: r.credentialId,
      software_id: r.softwareId,
      order_id: r.orderId,
      username: r.username,
      created_at: r.createdAt?.toISOString?.() ?? String(r.createdAt),
    }));
  }

  async create(input: { softwareId: number; username: string; passwordHash: string; orderId?: number | null }) {
    try {
      return await (this.prisma as any).softwareCredential.create({
        data: {
          softwareId: input.softwareId,
          orderId: input.orderId ?? null,
          username: input.username,
          passwordHash: input.passwordHash,
        },
        select: {
          credentialId: true,
          softwareId: true,
          orderId: true,
          username: true,
          createdAt: true,
        },
      });
    } catch (e: any) {
      // Prisma P2002: unique constraint
      if (e?.code === 'P2002') {
        throw new ConflictException({ error: 'username_in_use' });
      }
      throw e;
    }
  }

  async remove(id: number) {
    const exists = await (this.prisma as any).softwareCredential.findUnique({ where: { credentialId: id }, select: { credentialId: true } });
    if (!exists) throw new NotFoundException({ error: 'not_found' });
    await (this.prisma as any).softwareCredential.delete({ where: { credentialId: id } });
  }

  async findBySoftwareAndUsername(params: { softwareId: number; username: string }) {
    return (this.prisma as any).softwareCredential.findFirst({
      where: {
        softwareId: params.softwareId,
        username: params.username,
      },
      select: {
        credentialId: true,
        softwareId: true,
        username: true,
        passwordHash: true,
        createdAt: true,
      },
    });
  }

  async updatePassword(params: { credentialId: number; passwordHash: string }) {
    return (this.prisma as any).softwareCredential.update({
      where: { credentialId: params.credentialId },
      data: { passwordHash: params.passwordHash },
      select: { credentialId: true },
    });
  }
}
