import 'dotenv/config';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import type { Request } from 'express';
import { StorageService } from '../../common/storage/storage.service.js';

@Injectable()
export class UploadService {
  constructor(private readonly storage: StorageService) {}

  async upload(req: Request, file: Express.Multer.File) {
    if (!file) throw new BadRequestException({ error: 'no_file' });

    try {
      const baseFolder = process.env.GCS_UPLOAD_FOLDER || 'mrsmartservice';
      const subFolder = String(file.mimetype || '').startsWith('video/') ? 'videos' : 'images';

      const result = await this.storage.uploadBuffer({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        folder: `${baseFolder}/${subFolder}`,
      });

      let publicUrl: any = result.url;

      // Si es fallback local, convertimos a URL absoluta del API
      if (typeof publicUrl === 'string' && publicUrl.startsWith('/uploads/')) {
        const proto = String(req.headers['x-forwarded-proto'] || (req as any).protocol || 'http')
          .split(',')[0]
          .trim();
        const host = String(req.headers['x-forwarded-host'] || req.get('host') || '')
          .split(',')[0]
          .trim();
        publicUrl = host ? `${proto}://${host}${publicUrl}` : publicUrl;
      }

      return { url: publicUrl, object: (result as any).object };
    } catch (e: any) {
      throw new InternalServerErrorException({ error: 'upload_failed', message: e?.message || String(e) });
    }
  }
}
