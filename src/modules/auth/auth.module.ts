import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AUTH_REPOSITORY } from './domain/auth-repository.port.js';
import { AuthPrismaRepository } from './infrastructure/auth.prisma.repository.js';
import { LoginUseCase } from './application/usecases/login.usecase.js';
import { GetMeUseCase } from './application/usecases/get-me.usecase.js';
import { RequestPasswordResetUseCase } from './application/usecases/request-password-reset.usecase.js';
import { ResetPasswordUseCase } from './application/usecases/reset-password.usecase.js';
import { ChangePasswordUseCase } from './application/usecases/change-password.usecase.js';

@Module({
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
export class AuthModule {}
