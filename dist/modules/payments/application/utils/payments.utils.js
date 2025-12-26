export const MP_CURRENCY = process.env.MP_CURRENCY_ID || 'COP';
export function safeNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}
export function envBool(v, fallback) {
    if (v === undefined || v === null || v === '')
        return fallback;
    const s = String(v).trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes' || s === 'y';
}
export function baseUrlFromReq(req) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${process.env.PORT || 8080}`;
    return `${proto}://${host}`;
}
export function frontBase() {
    const s = String(process.env.FRONT_URL || '').trim().replace(/\/+$/, '');
    if (s)
        return s;
    return process.env.NODE_ENV === 'production' ? 'https://mrsmartservice-decad.web.app' : 'http://localhost:3000';
}
export function normalizeItem(i) {
    const productId = Number(i?.product_id ?? i?.productId ?? i?.id);
    const quantity = Math.max(1, Number(i?.quantity ?? 1));
    const title = String(i?.title ?? i?.name ?? `Producto #${productId}`).trim();
    const unit_price = safeNumber(i?.unit_price ?? i?.price);
    return { productId, quantity, title, unit_price };
}
//# sourceMappingURL=payments.utils.js.map