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
let UpdateProductUseCase = class UpdateProductUseCase {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async execute(productId, dto) {
        if (!Number.isFinite(productId))
            throw new BadRequestException({ error: 'invalid_id' });
        try {
            const p = await this.repo.update(productId, dto);
            if (!p)
                throw new BadRequestException({ error: 'no_fields' });
            return toLegacyProduct(p);
        }
        catch (e) {
            if (e?.response?.error === 'no_fields')
                throw e;
            throw new InternalServerErrorException({ error: 'product_update_failed' });
        }
    }
};
UpdateProductUseCase = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ProductsRepository])
], UpdateProductUseCase);
export { UpdateProductUseCase };
//# sourceMappingURL=update-product.usecase.js.map