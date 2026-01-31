import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { SoftwareCredentialsRepository } from '../software-credentials/software-credentials.repository.js';

function normalizeUsername(u: string) {
  return String(u || '').trim().replace(/\s+/g, '');
}

@Injectable()
export class SoftwareAuthService {
  constructor(private readonly repo: SoftwareCredentialsRepository) {}

  async login(body: any) {
    const softwareId = Number(body?.software_id ?? body?.softwareId);
    const username = normalizeUsername(body?.username);
    const password = String(body?.password ?? '').trim();

    if (!Number.isFinite(softwareId) || softwareId <= 0) {
      throw new BadRequestException({ error: 'invalid_software_id' });
    }
    if (!username || username.length < 3) {
      throw new BadRequestException({ error: 'invalid_username' });
    }
    if (!password) {
      throw new BadRequestException({ error: 'missing_password' });
    }

    const cred = await this.repo.findBySoftwareAndUsername({ softwareId, username });
    if (!cred) throw new UnauthorizedException({ error: 'invalid_credentials' });

    const ok = await bcrypt.compare(password, cred.passwordHash);
    if (!ok) throw new UnauthorizedException({ error: 'invalid_credentials' });

    return {
      ok: true,
      credential_id: cred.credentialId,
      software_id: cred.softwareId,
      username: cred.username,
    };
  }

  async changePassword(body: any) {
    const softwareId = Number(body?.software_id ?? body?.softwareId);
    const username = normalizeUsername(body?.username);
    const oldPassword = String(body?.password ?? body?.old_password ?? '').trim();
    const newPassword = String(body?.new_password ?? body?.newPassword ?? '').trim();

    if (!Number.isFinite(softwareId) || softwareId <= 0) {
      throw new BadRequestException({ error: 'invalid_software_id' });
    }
    if (!username || username.length < 3) {
      throw new BadRequestException({ error: 'invalid_username' });
    }
    if (!oldPassword || !newPassword) {
      throw new BadRequestException({ error: 'missing_passwords' });
    }
    if (newPassword.length < 6) {
      throw new BadRequestException({ error: 'password_too_short' });
    }

    const cred = await this.repo.findBySoftwareAndUsername({ softwareId, username });
    if (!cred) throw new UnauthorizedException({ error: 'invalid_credentials' });

    const ok = await bcrypt.compare(oldPassword, cred.passwordHash);
    if (!ok) throw new UnauthorizedException({ error: 'invalid_credentials' });

    const hash = await bcrypt.hash(newPassword, 10);
    await this.repo.updatePassword({ credentialId: cred.credentialId, passwordHash: hash });
    return { ok: true };
  }
}
