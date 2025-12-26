import { Controller, Get } from '@nestjs/common';
import { MercadoPagoConfig, Preference } from 'mercadopago';

function has(v: any) {
  return typeof v === 'string' && v.trim().length > 0;
}

function trimRightSlash(u: string) {
  return (u || '').trim().replace(/\/+$/, '');
}

function resolveFrontBase() {
  const env = trimRightSlash(process.env.FRONT_URL || '');
  if (has(env)) return env;

  const fallback = process.env.NODE_ENV === 'production'
    ? 'https://mrsmartservice-decad.web.app'
    : 'http://localhost:3000';
  return fallback;
}

@Controller()
export class DiagnosticsController {
  @Get('/')
  root() {
    return 'mrsmartservice API OK';
  }

  @Get('api/health')
  health() {
    return { ok: true };
  }

  @Get('api/debug/env')
  debugEnv() {
    return {
      has_access_token: has(process.env.MP_ACCESS_TOKEN),
      token_prefix: (process.env.MP_ACCESS_TOKEN || '').slice(0, 6),
      front_url: process.env.FRONT_URL || null,
    };
  }

  @Get('api/debug/mp')
  async debugMp() {
    if (!has(process.env.MP_ACCESS_TOKEN)) {
      return { ok: false, message: 'missing_mp_access_token' };
    }

    const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
    const pref = new Preference(mp);
    const base = resolveFrontBase();

    const body: any = {
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
      init_point: (out as any).init_point,
      back_urls: body.back_urls,
    };
  }
}
