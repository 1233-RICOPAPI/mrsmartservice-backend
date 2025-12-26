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
let DeleteProductUseCase = class DeleteProductUseCase {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async execute(productId) {
        if (!Number.isFinite(productId))
            throw new BadRequestException({ error: 'invalid_id' });
        try {
            const result = await this.repo.hardDelete(productId);
            if (result?.soft_deleted)
                return { ok: true, deleted: false, softDeleted: true, reason: 'referenced_by_orders' };
            return { ok: true, deleted: true };
        }
        catch {
            throw new InternalServerErrorException({ error: 'product_delete_failed' });
        }
    }
};
DeleteProductUseCase = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ProductsRepository])
], DeleteProductUseCase);
export { DeleteProductUseCase };
//# sourceMappingURL=delete-product.usecase.js.map