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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';
import { CreateAdDto } from './dto/create-ad.dto.js';
import { UpdateAdDto } from './dto/update-ad.dto.js';
import { ListPublicAdsUseCase } from './application/usecases/list-public-ads.usecase.js';
import { ListAdminAdsUseCase } from './application/usecases/list-admin-ads.usecase.js';
import { CreateAdUseCase } from './application/usecases/create-ad.usecase.js';
import { UpdateAdUseCase } from './application/usecases/update-ad.usecase.js';
import { DeleteAdUseCase } from './application/usecases/delete-ad.usecase.js';
let AdsController = class AdsController {
    listPublicUC;
    listAdminUC;
    createUC;
    updateUC;
    deleteUC;
    constructor(listPublicUC, listAdminUC, createUC, updateUC, deleteUC) {
        this.listPublicUC = listPublicUC;
        this.listAdminUC = listAdminUC;
        this.createUC = createUC;
        this.updateUC = updateUC;
        this.deleteUC = deleteUC;
    }
    // Publicidad Home (público)
    async listActive() {
        return this.listPublicUC.execute();
    }
    // Admin: listar todo (staff/admin)
    async listAll() {
        return this.listAdminUC.execute();
    }
    // Admin: crear
    async create(dto) {
        return this.createUC.execute(dto);
    }
    // Admin: actualizar
    async update(id, dto) {
        return this.updateUC.execute(Number(id), dto);
    }
    // Admin: borrar
    async remove(id) {
        return this.deleteUC.execute(Number(id));
    }
};
__decorate([
    Get('ads'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "listActive", null);
__decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles('ADMIN', 'DEV_ADMIN', 'STAFF'),
    Get('ads/all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "listAll", null);
__decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles('ADMIN', 'DEV_ADMIN'),
    Post('ads'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateAdDto]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "create", null);
__decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles('ADMIN', 'DEV_ADMIN'),
    Put('ads/:id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateAdDto]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "update", null);
__decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles('ADMIN', 'DEV_ADMIN'),
    Delete('ads/:id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "remove", null);
AdsController = __decorate([
    Controller('api'),
    __metadata("design:paramtypes", [ListPublicAdsUseCase,
        ListAdminAdsUseCase,
        CreateAdUseCase,
        UpdateAdUseCase,
        DeleteAdUseCase])
], AdsController);
export { AdsController };
//# sourceMappingURL=ads.controller.js.map