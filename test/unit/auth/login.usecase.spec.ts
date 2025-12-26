import bcrypt from 'bcryptjs';
import { LoginUseCase } from '../../../src/modules/auth/application/usecases/login.usecase.js';
import type { AuthRepositoryPort } from '../../../src/modules/auth/domain/auth-repository.port.js';

describe('LoginUseCase', () => {
  const makeRepo = (user: any | null): AuthRepositoryPort => ({
    findByEmail: async () => user,
    findById: async () => null,
    createPasswordReset: async () => ({ id: 1, userId: 1, expiresAt: new Date(), used: false }),
    findPasswordResetByToken: async () => null,
    markPasswordResetUsed: async () => undefined,
    updateUserPassword: async () => undefined,
  });

  beforeEach(() => {
    process.env.JWT_SECRET = 'test_secret';
  });

  it('returns missing_credentials when email or password missing', async () => {
    const uc = new LoginUseCase(makeRepo(null));
    expect(await uc.execute('', 'x')).toEqual({ error: 'missing_credentials' });
    expect(await uc.execute('a@b.com', '')).toEqual({ error: 'missing_credentials' });
  });

  it('returns invalid_credentials when user not found', async () => {
    const uc = new LoginUseCase(makeRepo(null));
    expect(await uc.execute('no@user.com', 'pass')).toEqual({ error: 'invalid_credentials' });
  });

  it('returns token on success', async () => {
    const hash = await bcrypt.hash('pass123', 10);
    const user = {
      userId: 1,
      email: 'admin@tienda.com',
      passwordHash: hash,
      role: 'ADMIN',
      createdAt: new Date(),
    };
    const uc = new LoginUseCase(makeRepo(user));
    const out: any = await uc.execute('admin@tienda.com', 'pass123');
    expect(out.token).toBeTruthy();
    expect(out.role).toBe('ADMIN');
    expect(out.email).toBe('admin@tienda.com');
  });
});
