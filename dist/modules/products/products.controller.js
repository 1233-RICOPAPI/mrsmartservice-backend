var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
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
let ProductsController = class ProductsController {
    listUC;
    createUC;
    updateUC;
    deleteUC;
    constructor(listUC, createUC, updateUC, deleteUC) {
        this.listUC = listUC;
        this.createUC = createUC;
        this.updateUC = updateUC;
        this.deleteUC = deleteUC;
    }
    // Público: listado de productos activos con rating
    async list() {
        return this.listUC.execute();
    }
    // Admin: crear producto
    async create(dto) {
        return this.createUC.execute(dto);
    }
    // Admin: actualizar producto
    async update(id, dto) {
        return this.updateUC.execute(Number(id), dto);
    }
    // Admin: borrar producto (hard delete o soft delete)
    async remove(id) {
        return this.deleteUC.execute(Number(id));
    }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "list", null);
__decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles('ADMIN', 'DEV_ADMIN'),
    Post(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateProductDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "create", null);
__decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles('ADMIN', 'DEV_ADMIN'),
    Put(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateProductDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "update", null);
__decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles('ADMIN', 'DEV_ADMIN'),
    Delete(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "remove", null);
ProductsController = __decorate([
    Controller('api/products'),
    __metadata("design:paramtypes", [ListPublicProductsUseCase,
        CreateProductUseCase,
        UpdateProductUseCase,
        DeleteProductUseCase])
], ProductsController);
export { ProductsController };
//# sourceMappingURL=products.controller.js.map