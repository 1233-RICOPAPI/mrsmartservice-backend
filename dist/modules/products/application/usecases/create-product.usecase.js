var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ProductsRepository } from '../../products.repository.js';
import { toLegacyProduct } from '../mappers/product.mapper.js';
let CreateProductUseCase = class CreateProductUseCase {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async execute(dto) {
        const name = String(dto?.name || '').trim();
        if (!name)
            throw new BadRequestException({ error: 'missing_name' });
        const price = Number(dto?.price ?? 0);
        const stock = Number(dto?.stock ?? 0);
        if (!Number.isFinite(price))
            throw new BadRequestException({ error: 'bad_price' });
        if (!Number.isFinite(stock))
            throw new BadRequestException({ error: 'bad_stock' });
        try {
            const p = await this.repo.create(dto);
            return toLegacyProduct(p);
        }
        catch {
            throw new InternalServerErrorException({ error: 'product_create_failed' });
        }
    }
};
CreateProductUseCase = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ProductsRepository])
], CreateProductUseCase);
export { CreateProductUseCase };
//# sourceMappingURL=create-product.usecase.js.map