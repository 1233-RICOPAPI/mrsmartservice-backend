import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { LicensesService } from './licenses.service.js';

@Controller('api/licenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LicensesAdminController {
  constructor(private readonly service: LicensesService) {}

  @Get()
  @Roles('ADMIN', 'DEV_ADMIN')
  list(@Query() query: any) {
    return this.service.list(query);
  }

  @Post()
  @Roles('ADMIN', 'DEV_ADMIN')
  generate(@Body() body: any) {
    return this.service.generate(body);
  }

  @Patch(':id/revoke')
  @Roles('ADMIN', 'DEV_ADMIN')
  revoke(@Param('id') id: string) {
    return this.service.revoke(Number(id), true);
  }

  @Patch(':id/unrevoke')
  @Roles('ADMIN', 'DEV_ADMIN')
  unrevoke(@Param('id') id: string) {
    return this.service.revoke(Number(id), false);
  }
}

// Public endpoint (usado por software offline si deseas activar online)
@Controller('api/licenses')
export class LicensesPublicController {
  constructor(private readonly service: LicensesService) {}

  @Post('activate')
  activate(@Body() body: any) {
    return this.service.activate(body);
  }
}
