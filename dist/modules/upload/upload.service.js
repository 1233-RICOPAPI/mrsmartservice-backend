var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import 'dotenv/config';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { StorageService } from '../../common/storage/storage.service.js';
let UploadService = class UploadService {
    storage;
    constructor(storage) {
        this.storage = storage;
    }
    async upload(req, file) {
        if (!file)
            throw new BadRequestException({ error: 'no_file' });
        try {
            const baseFolder = process.env.GCS_UPLOAD_FOLDER || 'mrsmartservice';
            const subFolder = String(file.mimetype || '').startsWith('video/') ? 'videos' : 'images';
            const result = await this.storage.uploadBuffer({
                buffer: file.buffer,
                originalname: file.originalname,
                mimetype: file.mimetype,
                folder: `${baseFolder}/${subFolder}`,
            });
            let publicUrl = result.url;
            // Si es fallback local, convertimos a URL absoluta del API
            if (typeof publicUrl === 'string' && publicUrl.startsWith('/uploads/')) {
                const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http')
                    .split(',')[0]
                    .trim();
                const host = String(req.headers['x-forwarded-host'] || req.get('host') || '')
                    .split(',')[0]
                    .trim();
                publicUrl = host ? `${proto}://${host}${publicUrl}` : publicUrl;
            }
            return { url: publicUrl, object: result.object };
        }
        catch (e) {
            throw new InternalServerErrorException({ error: 'upload_failed', message: e?.message || String(e) });
        }
    }
};
UploadService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [StorageService])
], UploadService);
export { UploadService };
//# sourceMappingURL=upload.service.js.map