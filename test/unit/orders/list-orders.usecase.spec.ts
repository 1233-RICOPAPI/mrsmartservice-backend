import { ListOrdersUseCase } from '../../../src/modules/orders/application/usecases/list-orders.usecase.js';

describe('ListOrdersUseCase', () => {
  it('delegates to repository', async () => {
    const repo: any = { list: async (p: any) => ({ ok: true, params: p }) };
    const uc = new ListOrdersUseCase(repo);
    const out = await uc.execute({ status: 'PAID', q: 'a' });
    expect(out.ok).toBe(true);
    expect(out.params.status).toBe('PAID');
  });
});
