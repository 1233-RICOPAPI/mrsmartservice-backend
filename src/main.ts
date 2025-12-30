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

      // Vercel (tu dominio real)
  'https://mrsmartservice-front-next.vercel.app',
    // Local dev
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
  ].filter(Boolean) as string[];

  // ✅ 1) PRE-FLIGHT GLOBAL: evita OPTIONS 404 (Cloud Run / proxies)
  const expressApp = app.getHttpAdapter().getInstance();

  // Cloud Run / reverse proxies: required so req.protocol honors X-Forwarded-Proto.
  expressApp.set('trust proxy', 1);

  expressApp.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin as string | undefined;

    // Si no hay origin (curl/postman/health checks), no bloqueamos
    if (!origin) {
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      return next();
    }

    const isAllowed =
      allowedOrigins.includes(origin) || !has(process.env.FRONT_URL);

    if (isAllowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header(
        'Access-Control-Allow-Methods',
        'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      );
      res.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
      );
    }

    if (req.method === 'OPTIONS') {
      // Si el origin no está permitido, devolvemos 403 (mejor que 404)
      return res.sendStatus(isAllowed ? 204 : 403);
    }

    next();
  });

  // ✅ 2) NEST CORS (para requests reales)
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (!has(process.env.FRONT_URL)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
    preflightContinue: false,
  });

  // Límite para JSON (compat con el legacy)
  expressApp.use(express.json({ limit: '1mb' }));

  // Servir uploads locales
  expressApp.use('/uploads', express.static('uploads'));

  const port = Number(process.env.PORT || 8080);
  await app.listen(port);
  console.log(`API (Nest) running on port ${port}`);
}

bootstrap().catch((e) => {
  console.error('Fatal bootstrap error:', e);
  process.exit(1);
});
