import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const header = String(req.headers?.authorization || '');
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) throw new UnauthorizedException('no_token');
    if (!process.env.JWT_SECRET) throw new UnauthorizedException('server_config_error');

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('token_invalid');
    }
  }
}
