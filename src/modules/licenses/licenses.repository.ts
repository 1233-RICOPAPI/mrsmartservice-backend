import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class LicensesRepository {
  constructor(private readonly prisma: PrismaService) {}

  createLicense(data: {
    softwareId: number;
    customerEmail?: string | null;
    customerName?: string | null;
    customerNit?: string | null;
    customerCompany?: string | null;
    licenseType: string;
    majorMax: number;
    maxSites: number;
    maxDevices: number;
    expiresAt?: Date | null;
    notes?: string | null;
    licenseKey: string;
  }) {
    return this.prisma.license.create({
      data: {
        softwareId: data.softwareId,
        customerEmail: data.customerEmail ?? null,
        customerName: data.customerName ?? null,
        customerNit: data.customerNit ?? null,
        customerCompany: data.customerCompany ?? null,
        licenseType: data.licenseType,
        majorMax: data.majorMax,
        maxSites: data.maxSites,
        maxDevices: data.maxDevices,
        expiresAt: data.expiresAt ?? null,
        notes: data.notes ?? null,
        licenseKey: data.licenseKey,
      },
      include: { software: { select: { softwareId: true, name: true } } },
    });
  }

  getLicenseById(licenseId: number) {
    return this.prisma.license.findUnique({
      where: { licenseId },
      include: {
        software: { select: { softwareId: true, name: true } },
        activations: true,
      },
    });
  }

  getLicenseByKey(licenseKey: string) {
    return this.prisma.license.findFirst({
      where: { licenseKey },
      include: {
        software: { select: { softwareId: true, name: true } },
        activations: true,
      },
    });
  }

  listLicenses(filter: { softwareId?: number; customerEmail?: string; revoked?: boolean; q?: string }) {
    const where: any = {};
    if (typeof filter.softwareId === 'number') where.softwareId = filter.softwareId;
    if (typeof filter.revoked === 'boolean') where.revoked = filter.revoked;
    if (filter.customerEmail) where.customerEmail = String(filter.customerEmail).toLowerCase();
    if (filter.q) {
      const q = String(filter.q).trim();
      if (q) {
        where.OR = [
          { customerEmail: { contains: q, mode: 'insensitive' } },
          { customerName: { contains: q, mode: 'insensitive' } },
          { customerCompany: { contains: q, mode: 'insensitive' } },
          { customerNit: { contains: q, mode: 'insensitive' } },
        ];
      }
    }

    return this.prisma.license.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { software: { select: { softwareId: true, name: true } } },
    });
  }

  setRevoked(licenseId: number, revoked: boolean) {
    return this.prisma.license.update({
      where: { licenseId },
      data: { revoked, revokedAt: revoked ? new Date() : null },
    });
  }

  updateLicenseKey(licenseId: number, licenseKey: string) {
    return this.prisma.license.update({
      where: { licenseId },
      data: { licenseKey, updatedAt: new Date() },
      include: { software: { select: { softwareId: true, name: true } } },
    });
  }

  upsertActivation(licenseId: number, machineId: string, siteCode?: string | null) {
    return this.prisma.licenseActivation.upsert({
      where: { licenseId_machineId: { licenseId, machineId } },
      create: { licenseId, machineId, siteCode: siteCode ?? null, lastSeenAt: new Date() },
      update: { siteCode: siteCode ?? null, lastSeenAt: new Date(), deactivatedAt: null },
    });
  }

  countActiveDevices(licenseId: number) {
    return this.prisma.licenseActivation.count({ where: { licenseId, deactivatedAt: null } });
  }
}
