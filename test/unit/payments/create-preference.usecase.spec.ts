import { BadRequestException } from '@nestjs/common';
import { CreatePreferenceUseCase } from '../../../src/modules/payments/application/usecases/create-preference.usecase.js';

describe('CreatePreferenceUseCase', () => {
  it('throws when missing items', async () => {
    const prisma: any = { product: { findUnique: async () => null } };
    const mp: any = { preference: () => ({ create: async () => ({}) }) };
    const uc = new CreatePreferenceUseCase(prisma, mp);

    await expect(uc.execute({ items: [] } as any, {} as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns init_point on success', async () => {
    const prisma: any = {
      product: {
        findUnique: async () => ({
          price: 10000,
          discountPercent: 0,
          discountStart: null,
          discountEnd: null,
        }),
      },
    };

    const mp: any = {
      preference: () => ({
        create: async () => ({
          id: 'pref_1',
          init_point: 'https://mp/init',
          sandbox_init_point: 'https://mp/sandbox',
        }),
      }),
    };

    const uc = new CreatePreferenceUseCase(prisma, mp);

    const out: any = await uc.execute(
      { items: [{ product_id: 1, title: 'Prod', quantity: 1 }] } as any,
      { headers: {}, protocol: 'http', get: () => 'localhost' } as any,
    );

    expect(out.init_point).toBe('https://mp/init');
    expect(out.id).toBe('pref_1');
    expect(out.back_urls).toBeTruthy();
  });
});
