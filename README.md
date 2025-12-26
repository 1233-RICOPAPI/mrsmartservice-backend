# mrsmartservice API (NestJS + TypeScript)

Este backend es **NestJS en TypeScript**, manteniendo compatibilidad total con el frontend existente (misma API `/api/*`).

## Requisitos
- Node.js 18+ (recomendado 20+)
- Postgres

## Configuración
1. Copia `.env.example` a `.env` y completa las variables:

```bash
cp .env.example .env
```

Variables clave:
- `DATABASE_URL` **o** `DB_HOST/DB_USER/DB_PASS/DB_NAME`
- `JWT_SECRET`
- `FRONT_URL=http://localhost:3000`
- `MP_ACCESS_TOKEN` (Mercado Pago)

## Instalar
```bash
npm install
```

## Inicializar DB (solo 1 vez)
```bash
npm run db:init
```

## Desarrollo
```bash
npm run dev
```

## Producción
```bash
npm run build
npm start
```

## Credenciales admin (seed automático)
- `admin@tienda.com` / `Admin12345!`
- `dev@tienda.com` / `Dev12345!`

## Uploads
Si NO configuras `GCS_BUCKET`, el endpoint `/api/upload` usa fallback local en `./uploads` y sirve archivos en `/uploads/*`.
