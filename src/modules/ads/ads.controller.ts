import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { CreateAdDto } from './dto/create-ad.dto.js';
import { UpdateAdDto } from './dto/update-ad.dto.js';
import { ListPublicAdsUseCase } from './application/usecases/list-public-ads.usecase.js';
import { ListAdminAdsUseCase } from './application/usecases/list-admin-ads.usecase.js';
import { CreateAdUseCase } from './application/usecases/create-ad.usecase.js';
import { UpdateAdUseCase } from './application/usecases/update-ad.usecase.js';
import { DeleteAdUseCase } from './application/usecases/delete-ad.usecase.js';

@Controller('api')
export class AdsController {
  constructor(
    private readonly listPublicUC: ListPublicAdsUseCase,
    private readonly listAdminUC: ListAdminAdsUseCase,
    private readonly createUC: CreateAdUseCase,
    private readonly updateUC: UpdateAdUseCase,
    private readonly deleteUC: DeleteAdUseCase,
  ) {}

  // Publicidad Home (público)
  @Get('ads')
  async listActive() {
    return this.listPublicUC.execute();
  }

  // Admin: listar todo (staff/admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DEV_ADMIN', 'STAFF')
  @Get('ads/all')
  async listAll() {
    return this.listAdminUC.execute();
  }

  // Admin: crear
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DEV_ADMIN')
  @Post('ads')
  async create(@Body() dto: CreateAdDto) {
    return this.createUC.execute(dto);
  }

  // Admin: actualizar
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DEV_ADMIN')
  @Put('ads/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateAdDto) {
    return this.updateUC.execute(Number(id), dto);
  }

  // Admin: borrar
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DEV_ADMIN')
  @Delete('ads/:id')
  async remove(@Param('id') id: string) {
    return this.deleteUC.execute(Number(id));
  }
}
