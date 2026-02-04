import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';

@Controller('api/invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get('admin/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DEV_ADMIN', 'STAFF', 'CONTADOR')
  getInvoiceAdmin(@Param('orderId') orderId: string) {
    return this.invoices.getInvoiceForAdmin(Number(orderId));
  }

  @Get(':orderId')
  getInvoice(@Param('orderId') orderId: string, @Query('token') token?: string) {
    return this.invoices.getInvoiceJson(Number(orderId), token);
  }
}
