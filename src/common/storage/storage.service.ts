import 'dotenv/config';
import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

@Injectable()
export class StorageService {
  private storage = new Storage();
  private bucketName = process.env.GCS_BUCKET;

  constructor() {
    if (!this.bucketName) {
      console.warn('[storage] Falta env GCS_BUCKET. Usando fallback local ./uploads para /api/upload');
    }
  }

  private safeExtFromName(originalname: string) {
    const ext = path.extname(originalname || '') || '';
    return ext.length <= 10 ? ext : '';
  }

  private async uploadLocal(opts: { buffer: Buffer; originalname: string; folder: string }) {
    const uploadsDir = path.resolve('uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeExt = this.safeExtFromName(opts.originalname);
    const safeFolder = String(opts.folder || 'mrsmartservice')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .slice(0, 80);
    const filename = `${safeFolder}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`;
    const full = path.join(uploadsDir, filename);
    await fs.writeFile(full, opts.buffer);

    return {
      storage: 'local',
      bucket: null,
      object: filename,
      url: `/uploads/${encodeURIComponent(filename)}`,
    };
  }

  async uploadBuffer(opts: { buffer: Buffer; originalname: string; mimetype?: string; folder?: string }) {
    const folder = opts.folder || 'mrsmartservice';

    if (!this.bucketName) {
      return this.uploadLocal({ buffer: opts.buffer, originalname: opts.originalname, folder });
    }

    const bucket = this.storage.bucket(this.bucketName);
    const safeExt = this.safeExtFromName(opts.originalname);
    const objectName = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`;
    const file = bucket.file(objectName);

    await file.save(opts.buffer, {
      resumable: false,
      contentType: opts.mimetype || 'application/octet-stream',
      metadata: { cacheControl: 'public, max-age=31536000' },
    });

    return {
      storage: 'gcs',
      bucket: this.bucketName,
      object: objectName,
      url: `https://storage.googleapis.com/${this.bucketName}/${encodeURI(objectName)}`,
    };
  }
}
