var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BadRequestException, Injectable } from '@nestjs/common';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
let MpClientService = class MpClientService {
    mp;
    constructor() {
        const token = process.env.MP_ACCESS_TOKEN;
        if (!token) {
            // No tiramos error al bootstrap; lo lanzamos cuando se use.
            // eslint-disable-next-line no-console
            console.error('❌ Falta MP_ACCESS_TOKEN en variables de entorno');
        }
        this.mp = new MercadoPagoConfig({ accessToken: token || 'MP_ACCESS_TOKEN_NOT_SET' });
    }
    assertConfigured() {
        const token = process.env.MP_ACCESS_TOKEN;
        if (!token)
            throw new BadRequestException({ error: 'mp_not_configured' });
    }
    preference() {
        this.assertConfigured();
        return new Preference(this.mp);
    }
    payment() {
        this.assertConfigured();
        return new Payment(this.mp);
    }
};
MpClientService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [])
], MpClientService);
export { MpClientService };
//# sourceMappingURL=mp-client.service.js.map