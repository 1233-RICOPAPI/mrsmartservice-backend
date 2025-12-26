import {
  Controller,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { UploadService } from './upload.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/guards/roles.decorator.js';

@Controller('api')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  // Compatibilidad: POST /api/upload (fields: image|file)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DEV_ADMIN', 'STAFF')
  @Post('upload')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 1 },
        { name: 'file', maxCount: 1 },
      ],
      {
        storage: multer.memoryStorage(),
        limits: {
          fileSize: Number(process.env.UPLOAD_MAX_BYTES || 25 * 1024 * 1024),
        },
      },
    ),
  )
  async upload(
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      file?: Express.Multer.File[];
    },
    @Req() req: Request,
  ) {
    const f = (files?.image && files.image[0]) || (files?.file && files.file[0]) || null;
    return this.uploadService.upload(req, f as any);
  }
}
