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
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { LoginDto } from './dto/login.dto.js';
import { RequestResetDto } from './dto/request-reset.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { Roles } from './guards/roles.decorator.js';
import { LoginUseCase } from './application/usecases/login.usecase.js';
import { GetMeUseCase } from './application/usecases/get-me.usecase.js';
import { RequestPasswordResetUseCase } from './application/usecases/request-password-reset.usecase.js';
import { ResetPasswordUseCase } from './application/usecases/reset-password.usecase.js';
import { ChangePasswordUseCase } from './application/usecases/change-password.usecase.js';
let AuthController = class AuthController {
    loginUC;
    meUC;
    requestResetUC;
    resetPasswordUC;
    changePasswordUC;
    constructor(loginUC, meUC, requestResetUC, resetPasswordUC, changePasswordUC) {
        this.loginUC = loginUC;
        this.meUC = meUC;
        this.requestResetUC = requestResetUC;
        this.resetPasswordUC = resetPasswordUC;
        this.changePasswordUC = changePasswordUC;
    }
    login(dto) {
        return this.loginUC.execute(dto.email, dto.password);
    }
    requestReset(dto) {
        return this.requestResetUC.execute(dto.email);
    }
    resetPassword(dto) {
        return this.resetPasswordUC.execute(dto.token, dto.password);
    }
    async me(req) {
        const userId = Number(req.user?.user_id ?? req.user?.sub);
        return this.meUC.execute(userId);
    }
    async changePassword(req, dto) {
        const userId = Number(req.user?.user_id ?? req.user?.sub);
        return this.changePasswordUC.execute(userId, dto.oldPassword, dto.newPassword);
    }
};
__decorate([
    Post('api/login'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    Post('api/auth/request-reset'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RequestResetDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "requestReset", null);
__decorate([
    Post('api/auth/reset-password'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ResetPasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "resetPassword", null);
__decorate([
    UseGuards(JwtAuthGuard),
    Get('api/me'),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
__decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles('ADMIN', 'DEV_ADMIN', 'STAFF'),
    Post('api/users/change-password'),
    __param(0, Req()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ChangePasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
AuthController = __decorate([
    Controller(),
    __metadata("design:paramtypes", [LoginUseCase,
        GetMeUseCase,
        RequestPasswordResetUseCase,
        ResetPasswordUseCase,
        ChangePasswordUseCase])
], AuthController);
export { AuthController };
//# sourceMappingURL=auth.controller.js.map