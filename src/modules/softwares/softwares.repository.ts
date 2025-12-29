import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreateSoftwareDto } from './dto/create-software.dto.js';
import { UpdateSoftwareDto } from './dto/update-software.dto.js';

@Injectable()
export class SoftwaresRepository {
  constructor(private readonly prisma: PrismaService) {}

  listActive() {
    return (this.prisma as any).software.findMany({
      where: { active: true },
      orderBy: { softwareId: 'desc' },
    });
  }

  listAdmin() {
    return (this.prisma as any).software.findMany({ orderBy: { softwareId: 'desc' } });
  }

  getActiveById(id: number) {
    return (this.prisma as any).software.findFirst({
      where: { softwareId: id, active: true },
    });
  }

  create(dto: CreateSoftwareDto) {
    return (this.prisma as any).software.create({
      data: {
        name: dto.name,
        shortDescription: dto.short_description ?? null,
        features: dto.features ?? null,
        tags: dto.tags ?? null,
        price: (dto.price ?? 0) as any,
        imageUrl: dto.image_url ?? null,
        whatsappMessageTemplate: dto.whatsapp_message_template ?? null,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateSoftwareDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.short_description !== undefined) data.shortDescription = dto.short_description;
    if (dto.features !== undefined) data.features = dto.features;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.price !== undefined) data.price = dto.price as any;
    if (dto.image_url !== undefined) data.imageUrl = dto.image_url;
    if (dto.whatsapp_message_template !== undefined)
      data.whatsappMessageTemplate = dto.whatsapp_message_template;
    if (dto.active !== undefined) data.active = dto.active;
    if (!Object.keys(data).length) return null;
    // actualiza updatedAt
    data.updatedAt = new Date();
    return (this.prisma as any).software.update({ where: { softwareId: id }, data });
  }

  remove(id: number) {
    return (this.prisma as any).software.delete({ where: { softwareId: id } });
  }
}
