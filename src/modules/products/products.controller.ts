import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { ListPublicProductsUseCase } from './application/usecases/list-public-products.usecase.js';
import { CreateProductUseCase } from './application/usecases/create-product.usecase.js';
import { UpdateProductUseCase } from './application/usecases/update-product.usecase.js';
import { DeleteProductUseCase } from './application/usecases/delete-product.usecase.js';

@Controller('api/products')
export class ProductsController {
  constructor(
    private readonly listUC: ListPublicProductsUseCase,
    private readonly createUC: CreateProductUseCase,
    private readonly updateUC: UpdateProductUseCase,
    private readonly deleteUC: DeleteProductUseCase,
  ) {}

  // Público: listado de productos activos con rating
  @Get()
  async list() {
    return this.listUC.execute();
  }

  // Admin: crear producto
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DEV_ADMIN')
  @Post()
  async create(@Body() dto: CreateProductDto) {
    return this.createUC.execute(dto);
  }

  // Admin: actualizar producto
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DEV_ADMIN')
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.updateUC.execute(Number(id), dto);
  }

  // Admin: borrar producto (hard delete o soft delete)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DEV_ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.deleteUC.execute(Number(id));
  }
}
