import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreateSoftwareDto } from './dto/create-software.dto.js';
import { UpdateSoftwareDto } from './dto/update-software.dto.js';

function toLegacyRow(r: any) {
  return {
    software_id: Number(r.software_id),
    name: r.name,
    short_description: r.short_description,
    features: r.features,
    tags: r.tags,
    price: r.price === null || r.price === undefined ? null : Number(r.price),
    image_url: r.image_url,
    // whatsapp_template eliminado (ya no se usa)
    active: Boolean(r.active),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

@Injectable()
export class SoftwaresService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic() {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      'SELECT software_id, name, short_description, features, tags, price, image_url, active, created_at, updated_at\n' +
        'FROM softwares\n' +
        'WHERE active = TRUE\n' +
        'ORDER BY software_id DESC',
    );
    return rows.map(toLegacyRow);
  }

  async listAdmin() {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      'SELECT software_id, name, short_description, features, tags, price, image_url, active, created_at, updated_at\n' +
        'FROM softwares\n' +
        'ORDER BY software_id DESC',
    );
    return rows.map(toLegacyRow);
  }

  async create(dto: CreateSoftwareDto) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      'INSERT INTO softwares (name, short_description, features, tags, price, image_url, active)\n' +
        'VALUES ($1,$2,$3,$4,$5,$6,$7)\n' +
        'RETURNING *',
      String(dto.name || '').trim(),
      dto.short_description ?? null,
      dto.features ?? null,
      dto.tags ?? null,
      dto.price === undefined ? null : Number(dto.price),
      dto.image_url ?? null,
      dto.active ?? true,
    );
    return toLegacyRow(rows?.[0]);
  }

  async update(id: number, dto: UpdateSoftwareDto) {
    // Build a dynamic UPDATE with only provided fields
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    const push = (col: string, v: any) => {
      sets.push(`${col} = $${idx++}`);
      vals.push(v);
    };

    if (dto.name !== undefined) push('name', dto.name);
    if (dto.short_description !== undefined) push('short_description', dto.short_description);
    if (dto.features !== undefined) push('features', dto.features);
    if (dto.tags !== undefined) push('tags', dto.tags);
    if (dto.price !== undefined) push('price', dto.price === null ? null : Number(dto.price));
    if (dto.image_url !== undefined) push('image_url', dto.image_url);
    // whatsapp_template eliminado (ya no se usa)
    if (dto.active !== undefined) push('active', dto.active);

    if (!sets.length) throw new NotFoundException('no_changes');
    push('updated_at', new Date());

    vals.push(id);
    const sql = `UPDATE softwares SET ${sets.join(', ')} WHERE software_id = $${idx} RETURNING *`;
    const rows = await this.prisma.$queryRawUnsafe<any[]>(sql, ...vals);
    if (!rows?.length) throw new NotFoundException('not_found');
    return toLegacyRow(rows[0]);
  }

  async remove(id: number) {
    await this.prisma.$executeRawUnsafe('DELETE FROM softwares WHERE software_id = $1', id);
    return { ok: true };
  }
}
