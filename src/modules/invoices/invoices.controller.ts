import { Controller, Get, Param, Query } from '@nestjs/common';
import { InvoicesService } from './invoices.service.js';

@Controller('api/invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get(':orderId')
  getInvoice(@Param('orderId') orderId: string, @Query('token') token?: string) {
    return this.invoices.getInvoiceJson(Number(orderId), token);
  }
}
