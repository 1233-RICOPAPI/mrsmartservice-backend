import { BadRequestException, Injectable } from '@nestjs/common';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

@Injectable()
export class MpClientService {
  private readonly mp: MercadoPagoConfig;
  // Para desarrollo/local: permite iniciar checkout sin credenciales reales.
  // Activa con MP_MOCK=1 (o true/yes).
  private readonly mockEnabled = ['1', 'true', 'yes'].includes((process.env.MP_MOCK || '').toLowerCase());

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
    if (!token && !this.mockEnabled) throw new BadRequestException({ error: 'mp_not_configured' });
  }

  preference() {
    const token = process.env.MP_ACCESS_TOKEN;
    // En modo mock devolvemos un cliente "fake" compatible con .create()
    if (!token && this.mockEnabled) {
      return {
        create: async () => ({
          id: 'PREF_MOCK',
          init_point: 'https://mock.mercadopago/init',
          sandbox_init_point: 'https://mock.mercadopago/init',
        }),
      } as any;
    }

    this.assertConfigured();
    return new Preference(this.mp);
  }

  payment() {
    this.assertConfigured();
    return new Payment(this.mp);
  }
}
