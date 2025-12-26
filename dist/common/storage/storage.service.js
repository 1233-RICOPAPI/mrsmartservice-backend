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
import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
let StorageService = class StorageService {
    storage = new Storage();
    bucketName = process.env.GCS_BUCKET;
    constructor() {
        if (!this.bucketName) {
            console.warn('[storage] Falta env GCS_BUCKET. Usando fallback local ./uploads para /api/upload');
        }
    }
    safeExtFromName(originalname) {
        const ext = path.extname(originalname || '') || '';
        return ext.length <= 10 ? ext : '';
    }
    async uploadLocal(opts) {
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
    async uploadBuffer(opts) {
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
};
StorageService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [])
], StorageService);
export { StorageService };
//# sourceMappingURL=storage.service.js.map