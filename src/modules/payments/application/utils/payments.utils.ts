import type { Request } from 'express';

export const MP_CURRENCY = process.env.MP_CURRENCY_ID || 'COP';

export function safeNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function envBool(v: any, fallback: boolean) {
  if (v === undefined || v === null || v === '') return fallback;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'y';
}

export function baseUrlFromReq(req: Request) {
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || `localhost:${process.env.PORT || 8080}`;
  return `${proto}://${host}`;
}

export function frontBase() {
  const s = String(process.env.FRONT_URL || '').trim().replace(/\/+$/, '');
  if (s) return s;
  return process.env.NODE_ENV === 'production' ? 'https://mrsmartservice-decad.web.app' : 'http://localhost:3000';
}

export function normalizeItem(i: any) {
  const rawId = i?.product_id ?? i?.productId ?? i?.id;
  const rawIdStr = rawId === undefined || rawId === null ? '' : String(rawId).trim();
  const isShipping = rawIdStr.toUpperCase() === 'SHIP' || String(i?.type || '').toLowerCase() === 'shipping';

  const parsedId = Number(rawIdStr);
  const productId = isShipping ? 0 : (Number.isFinite(parsedId) ? parsedId : null);
  const quantity = Math.max(1, Number(i?.quantity ?? 1));
  const title = String(i?.title ?? i?.name ?? (isShipping ? 'Envío' : `Producto #${productId}`)).trim();
  const unit_price = safeNumber(i?.unit_price ?? i?.price);
  return { productId, quantity, title, unit_price, isShipping };
}