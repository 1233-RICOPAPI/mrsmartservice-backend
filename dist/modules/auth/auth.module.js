var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AUTH_REPOSITORY } from './domain/auth-repository.port.js';
import { AuthPrismaRepository } from './infrastructure/auth.prisma.repository.js';
import { LoginUseCase } from './application/usecases/login.usecase.js';
import { GetMeUseCase } from './application/usecases/get-me.usecase.js';
import { RequestPasswordResetUseCase } from './application/usecases/request-password-reset.usecase.js';
import { ResetPasswordUseCase } from './application/usecases/reset-password.usecase.js';
import { ChangePasswordUseCase } from './application/usecases/change-password.usecase.js';
let AuthModule = class AuthModule {
};
AuthModule = __decorate([
    Module({
        controllers: [AuthController],
        providers: [
            LoginUseCase,
            GetMeUseCase,
            RequestPasswordResetUseCase,
            ResetPasswordUseCase,
            ChangePasswordUseCase,
            { provide: AUTH_REPOSITORY, useClass: AuthPrismaRepository },
        ],
        exports: [AUTH_REPOSITORY],
    })
], AuthModule);
export { AuthModule };
//# sourceMappingURL=auth.module.js.map