import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { LicensesRepository } from './licenses.repository.js';

function normalizeEmail(email: any) {
  const e = String(email || '').trim().toLowerCase();
  return e || null;
}

@Injectable()
export class LicensesService {
  constructor(private readonly repo: LicensesRepository) {}

  private getJwtSigningMaterial() {
    const priv = process.env.LICENSE_PRIVATE_KEY?.replace(/\\n/g, '\n') || null;
    const pub  = process.env.LICENSE_PUBLIC_KEY?.replace(/\\n/g, '\n') || null;
    const hs   = process.env.LICENSE_HS_SECRET || null;

    if (priv) {
      return { mode: 'RS256' as const, signKey: priv, verifyKey: pub || priv };
    }
    if (hs) {
      return { mode: 'HS256' as const, signKey: hs, verifyKey: hs };
    }
    throw new ServiceUnavailableException('license_keys_not_configured');
  }

  private signToken(payload: any, expiresAt: Date | null) {
    const mat = this.getJwtSigningMaterial();
    const opts: jwt.SignOptions = { algorithm: mat.mode, issuer: 'mrsmartservice' };
    if (expiresAt instanceof Date && !isNaN(expiresAt.getTime())) {
      const expSeconds = Math.floor(expiresAt.getTime() / 1000);
      opts.expiresIn = expSeconds - Math.floor(Date.now() / 1000);
      // si ya expiró, el token quedará inválido
      if ((opts.expiresIn as number) <= 0) {
        throw new BadRequestException('license_expired');
      }
    }
    return jwt.sign(payload, mat.signKey, opts);
  }

  verifyToken(token: string) {
    const mat = this.getJwtSigningMaterial();
    return jwt.verify(token, mat.verifyKey, { algorithms: [mat.mode], issuer: 'mrsmartservice' }) as any;
  }

  async list(query: any) {
    const softwareId = query?.software_id ? Number(query.software_id) : undefined;
    const customerEmail = query?.customer_email ? normalizeEmail(query.customer_email) : undefined;
    const revoked = typeof query?.revoked === 'string' ? (query.revoked === 'true') : undefined;
    const q = query?.q ? String(query.q) : undefined;
    const rows = await this.repo.listLicenses({ softwareId, customerEmail: customerEmail || undefined, revoked, q });
    return rows.map((r) => ({
      license_id: r.licenseId,
      software_id: r.softwareId,
      software_name: r.software?.name,
      customer_email: r.customerEmail,
      customer_name: r.customerName,
      customer_company: r.customerCompany,
      customer_nit: r.customerNit,
      license_type: r.licenseType,
      major_max: r.majorMax,
      max_sites: r.maxSites,
      max_devices: r.maxDevices,
      expires_at: r.expiresAt,
      revoked: r.revoked,
      revoked_at: r.revokedAt,
      notes: r.notes,
      license_key: r.licenseKey,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    }));
  }

  async generate(body: any) {
    const softwareId = Number(body?.software_id);
    if (!Number.isFinite(softwareId)) throw new BadRequestException('invalid_software_id');

    const licenseType = String(body?.license_type || 'PERPETUAL').toUpperCase();
    const majorMax = Number(body?.major_max ?? 1);
    const maxSites = Number(body?.max_sites ?? 3);
    const maxDevices = Number(body?.max_devices ?? 6);
    if (!Number.isFinite(majorMax) || majorMax < 1) throw new BadRequestException('invalid_major_max');
    if (!Number.isFinite(maxSites) || maxSites < 1) throw new BadRequestException('invalid_max_sites');
    if (!Number.isFinite(maxDevices) || maxDevices < 1) throw new BadRequestException('invalid_max_devices');

    let expiresAt: Date | null = null;
    if (body?.expires_at) {
      const d = new Date(body.expires_at);
      if (!isNaN(d.getTime())) expiresAt = d;
    }

    const customerEmail = normalizeEmail(body?.customer_email);
    const customerName = body?.customer_name ? String(body.customer_name).trim() : null;
    const customerNit = body?.customer_nit ? String(body.customer_nit).trim() : null;
    const customerCompany = body?.customer_company ? String(body.customer_company).trim() : null;
    const notes = body?.notes ? String(body.notes).trim() : null;

    // ✅ Para evitar confusiones entre softwares: el token SIEMPRE incluye software_id.
    // El software offline valida que coincida con su SOFTWARE_ID.
    const tokenPayload = {
      sid: softwareId,
      type: licenseType,
      major_max: majorMax,
      max_sites: maxSites,
      max_devices: maxDevices,
      email: customerEmail,
    };

    // Creamos primero la fila para obtener license_id, luego re-firmamos con lic
    const row1 = await this.repo.createLicense({
      softwareId,
      customerEmail,
      customerName,
      customerNit,
      customerCompany,
      licenseType,
      majorMax,
      maxSites,
      maxDevices,
      expiresAt,
      notes,
      licenseKey: 'PENDING',
    });

    const licenseId = row1.licenseId;
    const token = this.signToken({ ...tokenPayload, lic: licenseId }, expiresAt);

    // Guardamos token real
    const updated = await this.repo.updateLicenseKey(licenseId, token);

    return {
      license_id: updated.licenseId,
      software_id: updated.softwareId,
      software_name: updated.software?.name,
      license_key: updated.licenseKey,
      major_max: updated.majorMax,
      max_sites: updated.maxSites,
      max_devices: updated.maxDevices,
      license_type: updated.licenseType,
      expires_at: updated.expiresAt,
      revoked: updated.revoked,
      created_at: updated.createdAt,
    };
  }

  async revoke(id: number, revoked: boolean) {
    if (!Number.isFinite(id)) throw new BadRequestException('invalid_id');
    const row = await this.repo.getLicenseById(id);
    if (!row) throw new NotFoundException('license_not_found');
    await this.repo.setRevoked(id, revoked);
    return { ok: true };
  }

  async activate(body: any) {
    const token = String(body?.license_key || '').trim();
    const machineId = String(body?.machine_id || '').trim();
    const siteCode = body?.site_code ? String(body.site_code).trim() : null;
    if (!token) throw new BadRequestException('missing_license_key');
    if (!machineId) throw new BadRequestException('missing_machine_id');

    let payload: any;
    try {
      payload = this.verifyToken(token);
    } catch (e: any) {
      throw new BadRequestException('invalid_license_key');
    }

    const lic = Number(payload?.lic);
    const sid = Number(payload?.sid);
    if (!Number.isFinite(lic) || !Number.isFinite(sid)) throw new BadRequestException('invalid_license_key');

    const row = await this.repo.getLicenseById(lic);
    if (!row || row.licenseKey !== token) throw new BadRequestException('license_not_found');
    if (row.revoked) throw new BadRequestException('license_revoked');
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) throw new BadRequestException('license_expired');

    // dispositivo límite
    const activeCount = await this.repo.countActiveDevices(lic);
    const exists = row.activations?.some((a) => a.machineId === machineId && !a.deactivatedAt);
    if (!exists && activeCount >= row.maxDevices) {
      throw new BadRequestException('device_limit_reached');
    }

    await this.repo.upsertActivation(lic, machineId, siteCode);

    return {
      ok: true,
      license_id: row.licenseId,
      software_id: row.softwareId,
      major_max: row.majorMax,
      max_sites: row.maxSites,
      max_devices: row.maxDevices,
      expires_at: row.expiresAt,
    };
  }
}
