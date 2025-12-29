import crypto from 'crypto';

function has(v: any) {
  return typeof v === 'string' && v.trim().length > 0;
}

export function createInvoiceToken(orderId: number, ttlSeconds = 7 * 24 * 3600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${orderId}.${exp}`;
  const secret = has(process.env.JWT_SECRET) ? process.env.JWT_SECRET! : 'dev';
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyInvoiceToken(orderId: number, token: string) {
  try {
    const [oid, exp, sig] = String(token || '').split('.');
    if (Number(oid) !== Number(orderId)) return false;
    if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
    const payload = `${oid}.${exp}`;
    const secret = has(process.env.JWT_SECRET) ? process.env.JWT_SECRET! : 'dev';
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    return expected === sig;
  } catch {
    return false;
  }
}
