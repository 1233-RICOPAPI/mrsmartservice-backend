var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Controller, Get } from '@nestjs/common';
import { MercadoPagoConfig, Preference } from 'mercadopago';
function has(v) {
    return typeof v === 'string' && v.trim().length > 0;
}
function trimRightSlash(u) {
    return (u || '').trim().replace(/\/+$/, '');
}
function resolveFrontBase() {
    const env = trimRightSlash(process.env.FRONT_URL || '');
    if (has(env))
        return env;
    const fallback = process.env.NODE_ENV === 'production'
        ? 'https://mrsmartservice-decad.web.app'
        : 'http://localhost:3000';
    return fallback;
}
let DiagnosticsController = class DiagnosticsController {
    root() {
        return 'mrsmartservice API OK';
    }
    health() {
        return { ok: true };
    }
    debugEnv() {
        return {
            has_access_token: has(process.env.MP_ACCESS_TOKEN),
            token_prefix: (process.env.MP_ACCESS_TOKEN || '').slice(0, 6),
            front_url: process.env.FRONT_URL || null,
        };
    }
    async debugMp() {
        if (!has(process.env.MP_ACCESS_TOKEN)) {
            return { ok: false, message: 'missing_mp_access_token' };
        }
        const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
        const pref = new Preference(mp);
        const base = resolveFrontBase();
        const body = {
            items: [{ id: 'TEST', title: 'Item Test', unit_price: 12345, quantity: 1, currency_id: 'COP' }],
            binary_mode: true,
            back_urls: {
                success: `${base}/postpago.html`,
                failure: `${base}/postpago.html`,
                pending: `${base}/postpago.html`,
            },
        };
        const out = await pref.create({ body });
        return {
            ok: true,
            init_point: out.init_point,
            back_urls: body.back_urls,
        };
    }
};
__decorate([
    Get('/'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DiagnosticsController.prototype, "root", null);
__decorate([
    Get('api/health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DiagnosticsController.prototype, "health", null);
__decorate([
    Get('api/debug/env'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DiagnosticsController.prototype, "debugEnv", null);
__decorate([
    Get('api/debug/mp'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DiagnosticsController.prototype, "debugMp", null);
DiagnosticsController = __decorate([
    Controller()
], DiagnosticsController);
export { DiagnosticsController };
//# sourceMappingURL=diagnostics.controller.js.map