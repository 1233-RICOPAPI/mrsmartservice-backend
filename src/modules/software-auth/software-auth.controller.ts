import { Body, Controller, Post } from '@nestjs/common';
import { SoftwareAuthService } from './software-auth.service.js';

/**
 * Endpoints públicos para que el software OFFLINE valide credenciales.
 * NO usa JWT porque el cliente final no tiene token del panel.
 */
@Controller('api/software-auth')
export class SoftwareAuthController {
  constructor(private readonly service: SoftwareAuthService) {}

  @Post('login')
  login(@Body() body: any) {
    return this.service.login(body);
  }

  @Post('change-password')
  changePassword(@Body() body: any) {
    return this.service.changePassword(body);
  }
}
