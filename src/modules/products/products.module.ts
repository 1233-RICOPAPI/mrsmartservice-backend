import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { ProductsRepository } from './products.repository.js';
import { ListPublicProductsUseCase } from './application/usecases/list-public-products.usecase.js';
import { CreateProductUseCase } from './application/usecases/create-product.usecase.js';
import { UpdateProductUseCase } from './application/usecases/update-product.usecase.js';
import { DeleteProductUseCase } from './application/usecases/delete-product.usecase.js';

@Module({
  controllers: [ProductsController],
  providers: [
    ProductsRepository,
    ListPublicProductsUseCase,
    CreateProductUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
  ],
  exports: [ProductsRepository],
})
export class ProductsModule {}
