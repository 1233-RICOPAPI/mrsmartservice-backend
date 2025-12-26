var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
let JwtAuthGuard = class JwtAuthGuard {
    canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        const header = String(req.headers?.authorization || '');
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        if (!token)
            throw new UnauthorizedException('no_token');
        if (!process.env.JWT_SECRET)
            throw new UnauthorizedException('server_config_error');
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            req.user = payload;
            return true;
        }
        catch {
            throw new UnauthorizedException('token_invalid');
        }
    }
};
JwtAuthGuard = __decorate([
    Injectable()
], JwtAuthGuard);
export { JwtAuthGuard };
//# sourceMappingURL=jwt-auth.guard.js.map