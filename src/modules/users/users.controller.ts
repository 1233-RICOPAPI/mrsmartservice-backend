import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'DEV_ADMIN')
@Controller('api/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.listPanelUsers();
  }

  @Post()
  create(@Body() body: any) {
    return this.users.createPanelUser(body);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    const meId = req.user?.user_id ?? req.user?.sub ?? null;
    return this.users.deletePanelUser(Number(id), meId ? Number(meId) : null);
  }
}
