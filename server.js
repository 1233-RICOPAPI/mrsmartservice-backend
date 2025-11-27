// api/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import bcrypt from 'bcryptjs';                // para hashear/validar contraseñas
import { pool, query } from './db.js';        // conexión a PostgreSQL
import { seedAdminOnce, login, requireAdmin } from "./auth.js";

// ===== App base =====
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Servir archivos estáticos de imágenes subidas
app.use('/uploads', express.static('uploads'));

// ===== Multer (subida de imágenes) =====
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const name = Date.now() + '-' + Math.round(Math.random() * 1e6) + ext;
    cb(null, name);
  }
});

const upload = multer({ storage });

// ===== Utils =====
const has = (v) => typeof v === 'string' && v.trim().length > 0;
const trimRightSlash = (u) => (u || '').trim().replace(/\/+$/, '');

function resolveFrontBase() {
  const base = trimRightSlash(process.env.FRONT_URL);
  return has(base) ? base : null;
}

// back_urls OBLIGATORIAS para usar auto_return
function getBackUrls() {
  const base = resolveFrontBase();
  if (!base) return null;
  return {
    success: `${base}/carrito.html`,
    failure: `${base}/carrito.html`,
    pending: `${base}/carrito.html`,
  };
}

// ===== Validación de credenciales MP =====
if (!has(process.env.MP_ACCESS_TOKEN)) {
  console.error('❌ Falta MP_ACCESS_TOKEN en .env');
}

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

// ===== Seed admin por defecto =====
seedAdminOnce().catch(err => console.error("seedAdminOnce error:", err));

// ===== Health =====
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ===== Debug env =====
app.get('/api/debug/env', (_req, res) => {
  res.json({
    has_access_token: has(process.env.MP_ACCESS_TOKEN),
    token_prefix: (process.env.MP_ACCESS_TOKEN || '').slice(0, 6),
    front_url: process.env.FRONT_URL || null,
    trimmed_front: resolveFrontBase()
  });
});

// ===== Debug Mercado Pago =====
app.get('/api/debug/mp', async (_req, res) => {
  try {
    const back_urls = getBackUrls();
    console.log('🟢 FRONT_URL:', process.env.FRONT_URL);
    console.log('🟢 Back URLs:', back_urls);

    if (!back_urls) return res.status(400).json({ ok: false, error: 'missing_FRONT_URL' });

    const body = {
      items: [{ title: 'Item Test', unit_price: 12345, quantity: 1, currency_id: 'COP' }],
      binary_mode: true,
      back_urls: back_urls || undefined,
    };

    console.log('🟢 Body enviado a MP:', body);

    const pref = new Preference(mp);
    const out = await pref.create({ body });

    res.json({ ok: true, init_point: out.init_point, back_urls: body.back_urls });
  } catch (e) {
    const status = e?.cause?.status;
    const body = e?.cause?.response ? await e.cause.response.json() : null;
    console.error('MP DEBUG FAILED :: status=', status, ':: body=', body, ':: message=', e?.message);
    res.status(500).json({ ok: false, status, body, message: e?.message });
  }
});

// ================== AUTH ==================
app.post('/api/login', login);

// ================== CAMBIO DE CONTRASEÑA (ADMIN) ==================
app.post("/api/users/change-password", requireAdmin, async (req, res) => {
  try {
    // requireAdmin ya validó el token y dejó el usuario en req.user
    const userId = req.user?.user_id ?? req.user?.sub ?? null;

    const { oldPassword, newPassword } = req.body || {};
    console.log("[change-password] userId=", userId);

    if (!userId) {
      return res.status(401).json({ error: "unauthorized" });
    }

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "missing_fields" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "weak_password" });
    }

    // query devuelve array de filas
    const rows = await query(
      "SELECT user_id, password_hash FROM users WHERE user_id = $1",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const user = rows[0];

    // Validar contraseña actual
    const ok = await bcrypt.compare(oldPassword, user.password_hash);
    if (!ok) {
      return res.status(400).json({ error: "invalid_password" });
    }

    // Hashear nueva contraseña
    const newHash = await bcrypt.hash(newPassword, 10);

    // OJO: tu tabla users no tiene updated_at ⇒ solo actualizamos el hash
    await query(
      "UPDATE users SET password_hash = $1 WHERE user_id = $2",
      [newHash, user.user_id]
    );

    return res.json({ success: true });
  } catch (e) {
    console.error("POST /api/users/change-password error:", e);
    return res.status(500).json({ error: "change_password_failed" });
  }
});


// ================== UPLOAD IMÁGENES ==================
app.post('/api/upload', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });

  const url = `/uploads/${req.file.filename}`; // esta URL se guarda en image_url del producto
  res.json({ ok: true, url });
});

// ================== PRODUCTS CRUD ==================
// GET público (catálogo)
app.get('/api/products', async (_req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM products WHERE active = TRUE ORDER BY product_id DESC'
    );
    res.json(rows);
  } catch (e) {
    console.warn('DB off? get/products fallback []', e?.message);
    res.json([]);
  }
});

// POST protegido (crear producto)
app.post('/api/products', requireAdmin, async (req, res) => {
  const { name, price, stock, discount_percent = 0, image_url, category } = req.body;

  const rows = await query(
    `INSERT INTO products(name, price, stock, discount_percent, image_url, category)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [name, price, stock, discount_percent, image_url, category]
  );

  res.json(rows[0]);
});

// PUT protegido (editar producto)
app.put('/api/products/:id', requireAdmin, async (req, res) => {
  const id = +req.params.id;
  const fields = ['name', 'price', 'stock', 'discount_percent', 'image_url', 'category', 'active'];
  const sets = [];
  const args = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      sets.push(`${f}=$${sets.length + 1}`);
      args.push(req.body[f]);
    }
  }

  if (!sets.length) {
    return res.status(400).json({ error: 'no_fields' });
  }

  args.push(id);

  const rows = await query(
    `UPDATE products
     SET ${sets.join(',')}, updated_at=now()
     WHERE product_id=$${args.length}
     RETURNING *`,
    args
  );

  res.json(rows[0] ?? {});
});

// DELETE protegido (eliminar producto)
app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  const id = +req.params.id;
  await query('DELETE FROM products WHERE product_id=$1', [id]);
  res.json({ ok: true });
});

// ================== PAYMENTS (Mercado Pago v2) ==================
app.post('/api/payments/create', async (req, res) => {
  try {
    if (!has(process.env.MP_ACCESS_TOKEN)) {
      return res.status(500).json({ error: 'missing_access_token' });
    }

    const { items = [] } = req.body;
    if (!items.length) return res.status(400).json({ error: 'no_items' });

    const norm = items.map(i => ({
      product_id: i.product_id != null ? Number(i.product_id) : NaN,
      title: String(i.title || 'Producto'),
      unit_price: Number(i.unit_price || 0),
      quantity: Number(i.quantity || 1),
      currency_id: (i.currency_id || 'COP').toUpperCase()
    }));

    if (norm.some(i => !Number.isFinite(i.product_id))) {
      return res.status(400).json({ error: 'missing_product_id' });
    }
    if (norm.some(i => !Number.isFinite(i.unit_price) || i.unit_price <= 0)) {
      return res.status(400).json({ error: 'bad_price' });
    }

    // Validar stock
    for (const item of norm) {
      const rows = await query(
        'SELECT stock FROM products WHERE product_id = $1',
        [item.product_id]
      );

      if (!rows.length) {
        return res.status(400).json({ error: 'product_not_found', product_id: item.product_id });
      }

      const stock = Number(rows[0].stock) || 0;
      if (stock < item.quantity) {
        return res.status(400).json({ error: 'no_stock', product_id: item.product_id });
      }
    }

    const back_urls = getBackUrls();
    console.log('🟢 Back URLs (create):', back_urls);

    if (!back_urls) return res.status(500).json({ error: 'missing_front_url' });

    try {
      const total = norm.reduce((a, b) => a + b.unit_price * b.quantity, 0);
      await query(
        `INSERT INTO orders(status, total_amount)
         VALUES('pending', $1)`,
        [total]
      );
    } catch (e) {
      console.warn('orders insert skipped (DB off?)', e?.message);
    }

    const body = {
      items: norm.map(i => ({
        id: String(i.product_id),
        title: i.title,
        unit_price: i.unit_price,
        quantity: i.quantity,
        currency_id: i.currency_id
      })),
      binary_mode: true,
      back_urls: back_urls || undefined,
      metadata: { ts: Date.now() }
    };

    console.log('🟢 Body enviado a MP (create):', body);

    const pref = new Preference(mp);
    const out = await pref.create({ body });

    if (!out?.init_point) {
      console.error('MP sin init_point. Respuesta:', out);
      return res.status(502).json({ error: 'mp_no_init_point' });
    }

    res.json({ init_point: out.init_point });
  } catch (e) {
    try {
      const status = e?.cause?.status;
      const body = e?.cause?.response ? await e.cause.response.json() : null;
      console.error('MP FAILED :: status=', status, ':: body=', body, ':: message=', e?.message);
    } catch {
      console.error('MP FAILED (sin body parse):', e);
    }
    res.status(500).json({ error: 'mp_failed' });
  }
});

// ===== Webhook: actualizar orden + descontar stock =====
app.post('/api/payments/webhook', async (req, res) => {
  try {
    const event = req.body;

    if (event?.type === 'payment' && event.data?.id) {
      const paymentId = event.data.id;

      const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
      });

      const pay = await resp.json();
      console.log('🟢 WEBHOOK PAYMENT:', pay.id, pay.status);

      if (pay.status === 'approved') {
        const items = pay.additional_info?.items || [];

        for (const item of items) {
          const productId = Number(item.id);
          const qty = Number(item.quantity) || 0;

          if (Number.isFinite(productId) && qty > 0) {
            await query(
              `UPDATE products
                 SET stock = stock - $1
               WHERE product_id = $2`,
              [qty, productId]
            );
          }
        }

        await query(
          `UPDATE orders
             SET status = 'approved',
                 payment_id = $1,
                 payer_email = $2,
                 updated_at = now()
           WHERE status = 'pending'
           ORDER BY order_id DESC
           LIMIT 1`,
          [String(paymentId), pay.payer?.email || null]
        );
      }
    }
  } catch (e) {
    console.error('webhook error:', e);
  }

  res.sendStatus(200);
});

// ================== ORDERS (para panel de ventas) ==================
app.get("/api/orders", requireAdmin, async (req, res) => {
  try {
    const { status, q, from, to } = req.query;

    const where = [];
    const args = [];

    // filtro por estado
    if (status && status !== "todos") {
      args.push(status);
      where.push(`status = $${args.length}`);
    }

    // filtro por texto (order_id / email)
    if (q && q.trim()) {
      const like = `%${q.trim().toLowerCase()}%`;
      args.push(like, like);
      where.push(`(
        CAST(order_id AS TEXT) ILIKE $${args.length - 1}
        OR COALESCE(payer_email, '') ILIKE $${args.length}
      )`);
    }

    // filtro por fechas (opcional)
    if (from) {
      args.push(from);
      where.push(`created_at::date >= $${args.length}`);
    }
    if (to) {
      args.push(to);
      where.push(`created_at::date <= $${args.length}`);
    }

    const sql = `
      SELECT
        order_id,
        created_at,
        total_amount,
        status,
        COALESCE(payer_email, '') AS email,
        'Cliente' AS customer
      FROM orders
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY created_at DESC, order_id DESC
      LIMIT 200
    `;

    const rows = await query(sql, args);
    res.json(rows);
  } catch (e) {
    console.error("GET /api/orders error:", e);
    res.status(500).json({ error: "orders_failed" });
  }
});

// ================== STATS (dashboard admin) ==================
app.get('/api/stats/sales', requireAdmin, async (req, res) => {
  try {
    const range = req.query.range || 'month';

    const totalsRows = await query(`
      SELECT 
        COUNT(*)::int                         AS orders_count,
        COALESCE(SUM(total_amount), 0)::float AS total_amount
      FROM orders
      WHERE status = 'approved'
    `);

    const totals = totalsRows[0] || { orders_count: 0, total_amount: 0 };

    const globalRows = await query(`
      SELECT
        COUNT(*)::int AS total_orders,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)::int AS approved_orders
      FROM orders
    `);

    const global = globalRows[0] || { total_orders: 0, approved_orders: 0 };

    const ingresos = Number(totals.total_amount || 0);
    const ordenes  = Number(totals.orders_count || 0);
    const ticket   = ordenes > 0 ? Math.round(ingresos / ordenes) : 0;
    const rate     = global.total_orders > 0
      ? Math.round((global.approved_orders / global.total_orders) * 100)
      : 0;

    let groupExpr = "date(created_at)";
    let limit = 12;

    if (range === 'day') {
      groupExpr = "date_trunc('hour', created_at)";
      limit = 24;
    } else if (range === 'week') {
      groupExpr = "date_trunc('day', created_at)";
      limit = 7;
    } else if (range === 'year') {
      groupExpr = "date_trunc('month', created_at)";
      limit = 12;
    }

    const seriesRows = await query(
      `
      SELECT
        ${groupExpr} AS bucket,
        SUM(total_amount)::float AS total_amount
      FROM orders
      WHERE status = 'approved'
      GROUP BY bucket
      ORDER BY bucket
      LIMIT $1
      `,
      [limit]
    );

    const series = seriesRows.map(row => {
      const d = new Date(row.bucket);
      let label = '';

      if (range === 'day') {
        label = d.getHours().toString().padStart(2, '0') + 'h';
      } else if (range === 'week') {
        label = d.toLocaleDateString('es-CO', { weekday: 'short' });
      } else {
        label = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
      }

      return {
        label,
        value: Number(row.total_amount || 0)
      };
    });

    res.json({
      ingresos,
      ordenes,
      ticket,
      rate,
      series
    });
  } catch (e) {
    console.error('GET /api/stats/sales error:', e);
    res.status(500).json({ error: 'stats_failed' });
  }
});

// ===== Start =====
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
