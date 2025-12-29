import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { CreateSoftwareDto } from './dto/create-software.dto.js';
import { UpdateSoftwareDto } from './dto/update-software.dto.js';
import { ListPublicSoftwaresUseCase } from './application/usecases/list-public-softwares.usecase.js';
import { ListAdminSoftwaresUseCase } from './application/usecases/list-admin-softwares.usecase.js';
import { CreateSoftwareUseCase } from './application/usecases/create-software.usecase.js';
import { UpdateSoftwareUseCase } from './application/usecases/update-software.usecase.js';
import { DeleteSoftwareUseCase } from './application/usecases/delete-software.usecase.js';
import { GetPublicSoftwareByIdUseCase } from './application/usecases/get-public-software-by-id.usecase.js';

@Controller('api')
export class SoftwaresController {
  constructor(
    private readonly listPublicUC: ListPublicSoftwaresUseCase,
    private readonly getPublicByIdUC: GetPublicSoftwareByIdUseCase,
    private readonly listAdminUC: ListAdminSoftwaresUseCase,
    private readonly createUC: CreateSoftwareUseCase,
    private readonly updateUC: UpdateSoftwareUseCase,
    private readonly deleteUC: DeleteSoftwareUseCase,
  ) {}

  // Público: catálogo
  @Get('softwares')
  async listActive() {
    return this.listPublicUC.execute();
  }

  // Admin: listar todo
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DEV_ADMIN', 'STAFF')
  @Get('softwares/all')
  async listAll() {
    return this.listAdminUC.execute();
  }

  // Público: detalle
  // (OJO: debe ir DESPUÉS de /softwares/all para evitar choque de rutas)
  @Get('softwares/:id')
  async getActiveById(@Param('id') id: string) {
    const n = Number(id);
    if (!Number.isFinite(n)) throw new BadRequestException('invalid_id');
    return this.getPublicByIdUC.execute(n);
  }

  // Admin: crear
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DEV_ADMIN')
  @Post('softwares')
  async create(@Body() dto: CreateSoftwareDto) {
    return this.createUC.execute(dto);
  }

  // Admin: actualizar
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DEV_ADMIN')
  @Put('softwares/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateSoftwareDto) {
    return this.updateUC.execute(Number(id), dto);
  }

  // Admin: borrar
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DEV_ADMIN')
  @Delete('softwares/:id')
  async remove(@Param('id') id: string) {
    return this.deleteUC.execute(Number(id));
  }
}
