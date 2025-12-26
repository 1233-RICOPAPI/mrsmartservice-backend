var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { ProductsRepository } from '../../products.repository.js';
let ListPublicProductsUseCase = class ListPublicProductsUseCase {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async execute() {
        try {
            const rows = await this.repo.listPublicRaw();
            const now = new Date();
            return rows.map((product) => {
                let discount = Number(product.discount_percent || 0);
                if (product.discount_start && product.discount_end) {
                    const start = new Date(product.discount_start);
                    const end = new Date(product.discount_end);
                    if (now < start || now > end)
                        discount = 0;
                }
                return { ...product, discount_percent: discount };
            });
        }
        catch {
            return [];
        }
    }
};
ListPublicProductsUseCase = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ProductsRepository])
], ListPublicProductsUseCase);
export { ListPublicProductsUseCase };
//# sourceMappingURL=list-public-products.usecase.js.map