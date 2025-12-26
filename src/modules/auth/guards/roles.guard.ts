import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]) || [];

    if (!requiredRoles.length) return true;

    const req = ctx.switchToHttp().getRequest();
    const roleUpper = String((req.user as any)?.role || '').toUpperCase();

    const ok = requiredRoles.map((r) => String(r).toUpperCase()).includes(roleUpper);
    if (!ok) throw new ForbiddenException('forbidden');
    return true;
  }
}
