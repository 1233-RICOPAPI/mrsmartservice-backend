import { Body, Controller, Post } from '@nestjs/common';
import { SoftwareCredentialsService } from './software-credentials.service.js';

// Endpoints públicos (sin JWT) para que el comprador consulte sus credenciales
// usando order_id + email.
@Controller('api/customer-credentials')
export class CustomerCredentialsController {
  constructor(private readonly service: SoftwareCredentialsService) {}

  @Post()
  listByOrder(@Body() body: any) {
    return this.service.customerListByOrder(body);
  }

  @Post('regenerate')
  regenerate(@Body() body: any) {
    return this.service.customerRegeneratePassword(body);
  }
}
