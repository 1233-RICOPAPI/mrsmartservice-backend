import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service.js';
import { SoftwaresRepository } from '../../softwares.repository.js';

@Injectable()
export class DeleteSoftwareUseCase {
  constructor(
    private readonly repo: SoftwaresRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(id: number) {
    const licenseCount = await this.prisma.license.count({ where: { softwareId: id } });
    if (licenseCount > 0) {
      throw new ConflictException({
        error: 'software_has_licenses',
        message: `No se puede eliminar el software porque tiene ${licenseCount} licencia(s) asociada(s). Revoca o elimina las licencias primero.`,
      });
    }
    return this.repo.remove(id);
  }
}
