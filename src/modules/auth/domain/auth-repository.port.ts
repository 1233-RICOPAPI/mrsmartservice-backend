import type { User, PasswordReset } from '@prisma/client';

export type AuthUser = Pick<User, 'userId' | 'email' | 'passwordHash' | 'role' | 'createdAt'>;
export type AuthProfile = Pick<User, 'userId' | 'email' | 'role' | 'createdAt'>;
export type AuthUserAuth = Pick<User, 'userId' | 'passwordHash' | 'role'>;

// Nest DI token
export const AUTH_REPOSITORY = 'AUTH_REPOSITORY';

export interface AuthRepositoryPort {
  findByEmail(email: string): Promise<AuthUser | null>;
  getProfile(userId: number): Promise<AuthProfile | null>;
  getUserAuth(userId: number): Promise<AuthUserAuth | null>;

  createPasswordReset(userId: number, token: string, expiresAt: Date): Promise<number>;
  findPasswordResetByToken(token: string): Promise<Pick<PasswordReset, 'id' | 'userId' | 'expiresAt' | 'used'> | null>;
  markPasswordResetUsed(id: number): Promise<void>;
  updateUserPassword(userId: number, passwordHash: string): Promise<void>;
}
