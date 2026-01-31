import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { SoftwareCredentialsService } from './software-credentials.service.js';

@Controller('api/software-credentials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SoftwareCredentialsController {
  constructor(private readonly service: SoftwareCredentialsService) {}

  @Get()
  @Roles('ADMIN', 'DEV_ADMIN', 'STAFF')
  list(@Query() query: any) {
    return this.service.list(query);
  }

  @Post()
  @Roles('ADMIN', 'DEV_ADMIN')
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'DEV_ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
