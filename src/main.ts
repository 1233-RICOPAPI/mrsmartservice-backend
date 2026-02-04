import 'reflect-metadata';
import 'dotenv/config';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

function has(v: any) {
  return typeof v === 'string' && v.trim().length > 0;
}

function toOrigin(url: string | undefined) {
  try {
    if (!has(url)) return null;
    const u = new URL(url!);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: false,
    logger: ['log', 'error', 'warn'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );


  const allowedOrigins = [
    toOrigin(process.env.FRONT_URL),
    'https://mrsmartservice-decad.web.app',
    'https://mrsmartservice-decad.firebaseapp.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, cb) => {
      // Cloud Run + curl/postman no mandan Origin => permitir
      if (!origin) return cb(null, true);

      // Allow Vercel prod + any preview: https://mrsmartservice-front-next(-*)?.vercel.app
      const vercelOk = /^https:\/\/mrsmartservice-front-next(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin);
      if (vercelOk) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);

      // Si NO hay FRONT_URL, mejor permitir (para no bloquearte mientras migras)
      if (!has(process.env.FRONT_URL)) return cb(null, true);
      return cb(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const expressApp = app.getHttpAdapter().getInstance();

  // Límite para JSON (compat con el legacy)
  expressApp.use(express.json({ limit: '1mb' }));

  // Servir uploads locales
  expressApp.use('/uploads', express.static('uploads'));



  const port = Number(process.env.PORT || 8080);
  await app.listen(port, '0.0.0.0');
  console.log(`API (Nest) running on port ${port}`);
}

bootstrap().catch((e) => {
  console.error('Fatal bootstrap error:', e);
  process.exit(1);
});
