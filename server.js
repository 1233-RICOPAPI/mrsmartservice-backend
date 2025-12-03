// api/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import bcrypt from 'bcryptjs';
import { pool, query } from './db.js';
import {
  seedAdminOnce,
  login,
  requireAdmin,
  requireStaff,
  requestPasswordReset,
  resetPassword,
} from './auth.js';

// ===== App base =====
const app = express();

/**
 * CORS: permitir
 * - Netlify: https://sparkling-llama-c1c397.netlify.app
 * - Local front: http://localhost:5500 y http://127.0.0.1:5500
 * - Herramientas sin Origin (Postman, Thunder, etc.)
 */
const allowedOrigins = [
  'https://sparkling-llama-c1c397.netlify.app',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

const corsOptions = {
  origin(origin, callback) {
    // Sin origin (Postman, curl, etc.) -> permitir
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Si quieres debug:
    // console.warn('CORS bloqueado para origin:', origin);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight
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
  },
});
const upload = multer({ storage });

// ===== Utils =====
const has = (v) => typeof v === 'string' && v.trim().length > 0;
const trimRightSlash = (u) => (u || '').trim().replace(/\/+$/, '');

// FRONT_URL base (para back_urls de MP)
function resolveFrontBase() {
  const env = trimRightSlash(process.env.FRONT_URL);
  if (has(env)) return env;

  // Fallback SOLO para local si te olvidas FRONT_URL
  const fallback = 'http://127.0.0.1:5500/Ecomerce/web';
  console.warn('⚠️ FRONT_URL no definido, usando fallback:', fallback);
  return fallback;
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
seedAdminOnce().catch((err) => console.error('seedAdminOnce error:', err));

// ===== Health =====
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ===== Debug env =====
app.get('/api/debug/env', (_req, res) => {
  res.json({
    has_access_token: has(process.env.MP_ACCESS_TOKEN),
    token_prefix: (process.env.MP_ACCESS_TOKEN || '').slice(0, 6),
    front_url: process.env.FRONT_URL || null,
    trimmed_front: resolveFrontBase(),
  });
});

// ===== Debug Mercado Pago =====
app.get('/api/debug/mp', async (_req, res) => {
  try {
    const back_urls = getBackUrls();
    console.log('🟢 FRONT_URL:', process.env.FRONT_URL);
    console.log('🟢 Back URLs:', back_urls);

    if (!back_urls) {
      return res.status(400).json({ ok: false, error: 'missing_FRONT_URL' });
    }

    const body = {
      items: [
        {
          title: 'Item Test',
          unit_price: 12345,
          quantity: 1,
          currency_id: 'COP',
        },
      ],
      binary_mode: true,
      back_urls,
    };

    console.log('🟢 Body enviado a MP (debug):', body);

    const pref = new Preference(mp);
    const out = await pref.create({ body });

    return res.json({
      ok: true,
      init_point: out.init_point,
      back_urls: body.back_urls,
    });
  } catch (e) {
    try {
      const status = e?.cause?.status;
      const body = e?.cause?.response ? await e.cause.response.json() : null;
      console.error(
        'MP DEBUG FAILED :: status=',
        status,
        ':: body=',
        body,
        ':: message=',
        e?.message
      );
      return res
        .status(500)
        .json({ ok: false, status, body, message: e?.message });
    } catch (err2) {
      console.error('MP DEBUG FAILED (sin body parse):', e, 'extra:', err2);
      return res
        .status(500)
        .json({ ok: false, message: e?.message || 'mp_debug_failed' });
    }
  }
});

// ================== AUTH ==================
app.post('/api/login', login);

// Olvidé mi contraseña (solo admin/dev; hace INSERT en password_resets)
app.post('/api/auth/request-reset', requestPasswordReset);

// Formulario de nueva contraseña (usa token + nueva contraseña)
app.post('/api/auth/reset-password', resetPassword);

// /api/me para que el front pueda conocer el rol del usuario
app.get('/api/me', requireStaff, async (req, res) => {
  try {
    const userId = req.user?.user_id ?? req.user?.sub ?? null;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const rows = await query(
      `SELECT user_id, email, role, created_at
         FROM users
        WHERE user_id = $1`,
      [userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'user_not_found' });

    const { user_id, email, role, created_at } = rows[0];
    res.json({ user_id, email, role, created_at });
  } catch (e) {
    console.error('GET /api/me error:', e);
    res.status(500).json({ error: 'me_failed' });
  }
});

// ================== CAMBIO DE CONTRASEÑA (ADMIN + DEV) ==================
app.post('/api/users/change-password', requireStaff, async (req, res) => {
  try {
    const userId = req.user?.user_id ?? req.user?.sub ?? null;
    const { oldPassword, newPassword } = req.body || {};
    console.log('[change-password] userId=', userId);

    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'weak_password' });
    }

    const rows = await query(
      'SELECT user_id, password_hash FROM users WHERE user_id = $1',
      [userId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(oldPassword, user.password_hash);
    if (!ok) {
      return res.status(400).json({ error: 'invalid_password' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [
      newHash,
      user.user_id,
    ]);

    return res.json({ success: true });
  } catch (e) {
    console.error('POST /api/users/change-password error:', e);
    return res.status(500).json({ error: 'change_password_failed' });
  }
});

// ================== GESTIÓN DE USUARIOS (ADMIN + DEV) ==================
// Usuarios de panel (ADMIN / DEV_ADMIN), máx 3 extras (no cuenta admin/dev seed)

// ⚠️ SOLO ADMIN/DEV_ADMIN (por requireAdmin) crea usuarios
app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { email, password, role } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'missing_email' });
    }

    let rawPassword = null;
    if (password && typeof password === 'string' && password.trim().length) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'weak_password' });
      }
      rawPassword = password;
    } else {
      rawPassword = '12345678';
      console.warn(
        `[users] Usuario ${email} creado con password por defecto "12345678".`
      );
    }

    const cleanRole = String(role || 'DEV_ADMIN').toUpperCase();
    const allowedRoles = ['ADMIN', 'DEV_ADMIN'];
    const finalRole = allowedRoles.includes(cleanRole)
      ? cleanRole
      : 'DEV_ADMIN';

    const exists = await query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (exists.length) {
      return res.status(400).json({ error: 'email_in_use' });
    }

    // Contar solo usuarios de panel EXTRA (excluye admin/dev seed)
    const countRes = await query(
      `SELECT COUNT(*) 
         FROM users 
        WHERE UPPER(role) IN ('ADMIN','DEV_ADMIN')
          AND LOWER(email) NOT IN ('admin@tienda.com','dev@tienda.com')`
    );
    const count = Number(countRes[0].count || 0);
    if (count >= 3) {
      return res.status(400).json({ error: 'limit_reached' });
    }

    const hash = await bcrypt.hash(rawPassword, 10);
    const rows = await query(
      `INSERT INTO users(email, password_hash, role)
       VALUES($1, $2, $3)
       RETURNING user_id, email, role, created_at`,
      [email, hash, finalRole]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('POST /api/users error:', e);
    res.status(500).json({ error: 'user_create_failed' });
  }
});

// Reset password directo por email (ADMIN/DEV) – útil para usuarios normales
app.post('/api/users/reset-password', requireStaff, async (req, res) => {
  try {
    const { email, newPassword } = req.body || {};
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'weak_password' });
    }

    const rows = await query('SELECT user_id FROM users WHERE email = $1', [
      email,
    ]);
    if (!rows.length) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE email = $2', [
      hash,
      email,
    ]);

    res.json({ success: true });
  } catch (e) {
    console.error('POST /api/users/reset-password error:', e);
    res.status(500).json({ error: 'reset_failed' });
  }
});

// Listar usuarios de panel (ADMIN + DEV)
app.get('/api/users', requireStaff, async (_req, res) => {
  try {
    const rows = await query(
      `SELECT user_id, email, role, created_at
         FROM users
        WHERE UPPER(role) IN ('ADMIN','DEV_ADMIN')
        ORDER BY user_id ASC`
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /api/users error:', e);
    res.status(500).json({ error: 'users_list_failed' });
  }
});

// Eliminar usuario de panel
// ⚠️ SOLO ADMIN/DEV_ADMIN (requireAdmin) y NO permite borrar admin/dev seed
app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'bad_id' });

    const rows = await query(
      'SELECT email, role FROM users WHERE user_id = $1',
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    const email = String(rows[0].email || '').toLowerCase();
    if (['admin@tienda.com', 'dev@tienda.com'].includes(email)) {
      return res.status(400).json({ error: 'cannot_delete_seed' });
    }

    await query('DELETE FROM users WHERE user_id = $1', [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/users/:id error:', e);
    res.status(500).json({ error: 'user_delete_failed' });
  }
});

// ================== UPLOAD IMÁGENES ==================
app.post('/api/upload', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ ok: true, url });
});

// ================== PRODUCTS CRUD ==================
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

app.post('/api/products', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      price,
      stock,
      discount_percent = 0,
      image_url,
      category,
    } = req.body;

    const rows = await query(
      `INSERT INTO products(name, price, stock, discount_percent, image_url, category)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, price, stock, discount_percent, image_url, category]
    );

    res.json(rows[0]);
  } catch (e) {
    console.error('POST /api/products error:', e);
    res.status(500).json({ error: 'product_create_failed' });
  }
});

app.put('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const id = +req.params.id;
    const fields = [
      'name',
      'price',
      'stock',
      'discount_percent',
      'image_url',
      'category',
      'active',
    ];
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
  } catch (e) {
    console.error('PUT /api/products/:id error:', e);
    res.status(500).json({ error: 'product_update_failed' });
  }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const id = +req.params.id;
    await query('DELETE FROM products WHERE product_id=$1', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/products/:id error:', e);
    res.status(500).json({ error: 'product_delete_failed' });
  }
});

// ================== RESEÑAS DE PRODUCTOS ==================
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'bad_id' });

    const reviews = await query(
      `SELECT
         review_id,
         author_name AS name,
         rating,
         comment,
         created_at
       FROM product_reviews
       WHERE product_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    res.json(reviews);
  } catch (e) {
    console.error('GET /api/products/:id/reviews error:', e);
    res.status(500).json({ error: 'reviews_failed' });
  }
});

app.post('/api/products/:id/reviews', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, author, rating, comment } = req.body || {};

    if (!id) return res.status(400).json({ error: 'bad_id' });

    const authorName = (name || author || '').trim();
    if (!authorName || !rating) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    const r = Math.max(1, Math.min(5, Number(rating)));

    const rows = await query(
      `INSERT INTO product_reviews(product_id, author_name, rating, comment)
       VALUES($1, $2, $3, $4)
       RETURNING review_id,
                 author_name AS name,
                 rating,
                 comment,
                 created_at`,
      [id, authorName, r, comment || '']
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('POST /api/products/:id/reviews error:', e);
    res.status(500).json({ error: 'create_review_failed' });
  }
});

// ================== PAYMENTS (Mercado Pago v2) ==================
app.post('/api/payments/create', async (req, res) => {
  try {
    if (!has(process.env.MP_ACCESS_TOKEN)) {
      return res.status(500).json({ error: 'missing_access_token' });
    }

    const { items = [] } = req.body;
    if (!items.length) return res.status(400).json({ error: 'no_items' });

    const norm = items.map((i) => {
      const hasPid = i.product_id !== undefined && i.product_id !== null;
      return {
        product_id: hasPid ? Number(i.product_id) : null, // puede ser null para ENVIO
        title: String(i.title || 'Producto'),
        unit_price: Number(i.unit_price || 0),
        quantity: Number(i.quantity || 1),
        currency_id: (i.currency_id || 'COP').toUpperCase(),
      };
    });

    // product_id puede ser null (envío); si no es null debe ser numérico
    if (
      norm.some(
        (i) => i.product_id !== null && !Number.isFinite(i.product_id)
      )
    ) {
      return res.status(400).json({ error: 'bad_product_id' });
    }
    if (
      norm.some((i) => !Number.isFinite(i.unit_price) || i.unit_price <= 0)
    ) {
      return res.status(400).json({ error: 'bad_price' });
    }

    // Validar stock solo para productos reales
    for (const item of norm) {
      if (item.product_id === null) continue;

      const rows = await query(
        'SELECT stock FROM products WHERE product_id = $1',
        [item.product_id]
      );

      if (!rows.length) {
        return res
          .status(400)
          .json({ error: 'product_not_found', product_id: item.product_id });
      }

      const stock = Number(rows[0].stock) || 0;
      if (stock < item.quantity) {
        return res
          .status(400)
          .json({ error: 'no_stock', product_id: item.product_id });
      }
    }

    const back_urls = getBackUrls();
    console.log('🟢 Back URLs (create):', back_urls);
    if (!back_urls) return res.status(500).json({ error: 'missing_front_url' });

    const total = norm.reduce(
      (a, b) => a + b.unit_price * b.quantity,
      0
    );

    const client = await pool.connect();
    let orderId;
    try {
      await client.query('BEGIN');

      const orderRes = await client.query(
        `INSERT INTO orders(status, total_amount)
         VALUES('pending', $1)
         RETURNING order_id`,
        [total]
      );
      orderId = orderRes.rows[0].order_id;

      // IMPORTANTE: product_id puede ser NULL (para el item "Domicilio")
      for (const item of norm) {
        await client.query(
          `INSERT INTO order_items(order_id, product_id, quantity, unit_price)
           VALUES($1,$2,$3,$4)`,
          [orderId, item.product_id, item.quantity, item.unit_price]
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('❌ Error guardando orden + items:', e);
      return res.status(500).json({ error: 'order_save_failed' });
    } finally {
      client.release();
    }

    const body = {
      items: norm.map((i) => ({
        id: i.product_id !== null ? String(i.product_id) : 'ENVIO',
        title: i.title,
        unit_price: i.unit_price,
        quantity: i.quantity,
        currency_id: i.currency_id,
      })),
      binary_mode: true,
      back_urls,
      metadata: { ts: Date.now(), order_id: orderId },
    };

    console.log('🟢 Body enviado a MP (create):', body);

    const pref = new Preference(mp);
    const out = await pref.create({ body });

    if (!out?.init_point) {
      console.error('MP sin init_point. Respuesta:', out);
      return res.status(502).json({ error: 'mp_no_init_point' });
    }

    return res.json({ init_point: out.init_point });
  } catch (e) {
    // Este catch atrapa tanto errores de MP como cualquier otro
    try {
      const status = e?.cause?.status;
      const body = e?.cause?.response ? await e.cause.response.json() : null;
      console.error(
        'PAYMENTS /create FAILED :: status=',
        status,
        ':: body=',
        body,
        ':: message=',
        e?.message
      );
    } catch {
      console.error('PAYMENTS /create FAILED (sin body parse):', e);
    }
    return res.status(500).json({ error: 'mp_failed' });
  }
});

// ===== Webhook: actualizar orden + descontar stock =====
app.post('/api/payments/webhook', async (req, res) => {
  try {
    const event = req.body;

    if (event?.type === 'payment' && event.data?.id) {
      const paymentId = event.data.id;

      const resp = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
        }
      );

      const pay = await resp.json();
      console.log('🟢 WEBHOOK PAYMENT:', pay.id, pay.status);

      const orderIdMeta = pay.metadata?.order_id
        ? Number(pay.metadata.order_id)
        : null;

      if (pay.status === 'approved') {
        const items = pay.additional_info?.items || [];

        // Descontar stock (ignora ítems sin product_id numérico)
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
      }

      // Actualizar orden
      if (orderIdMeta) {
        await query(
          `UPDATE orders
             SET status = $1,
                 payment_id = $2,
                 payer_email = $3,
                 updated_at = now()
           WHERE order_id = $4`,
          [pay.status, String(paymentId), pay.payer?.email || null, orderIdMeta]
        );
      } else {
        await query(
          `UPDATE orders
             SET status = $1,
                 payment_id = $2,
                 payer_email = $3,
                 updated_at = now()
           WHERE payment_id IS NULL
           ORDER BY order_id DESC
           LIMIT 1`,
          [pay.status, String(paymentId), pay.payer?.email || null]
        );
      }
    }
  } catch (e) {
    console.error('webhook error:', e);
  }

  res.sendStatus(200);
});

// ================== ORDERS (para panel de ventas) ==================
app.get('/api/orders', requireStaff, async (req, res) => {
  try {
    const { status, q, from, to } = req.query;

    const where = [];
    const args = [];

    if (status && status !== 'todos') {
      args.push(status);
      where.push(`status = $${args.length}`);
    }

    if (q && q.trim()) {
      const like = `%${q.trim().toLowerCase()}%`;
      args.push(like, like);
      where.push(`(
        CAST(order_id AS TEXT) ILIKE $${args.length - 1}
        OR COALESCE(payer_email, '') ILIKE $${args.length}
      )`);
    }

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
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY created_at DESC, order_id DESC
      LIMIT 200
    `;

    const rows = await query(sql, args);
    res.json(rows);
  } catch (e) {
    console.error('GET /api/orders error:', e);
    res.status(500).json({ error: 'orders_failed' });
  }
});

// ================== STATS (dashboard admin/dev) ==================
app.get('/api/stats/sales', requireStaff, async (req, res) => {
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

    const global = globalRows[0] || {
      total_orders: 0,
      approved_orders: 0,
    };

    const ingresos = Number(totals.total_amount || 0);
    const ordenes = Number(totals.orders_count || 0);
    const ticket = ordenes > 0 ? Math.round(ingresos / ordenes) : 0;
    const rate =
      global.total_orders > 0
        ? Math.round((global.approved_orders / global.total_orders) * 100)
        : 0;

    let groupExpr = 'date(created_at)';
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

    const series = seriesRows.map((row) => {
      const d = new Date(row.bucket);
      let label = '';

      if (range === 'day') {
        label = d.getHours().toString().padStart(2, '0') + 'h';
      } else if (range === 'week') {
        label = d.toLocaleDateString('es-CO', { weekday: 'short' });
      } else {
        label = d.toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short',
        });
      }

      return {
        label,
        value: Number(row.total_amount || 0),
      };
    });

    res.json({
      ingresos,
      ingresosDelta: 0,
      ordenes,
      ordenesDelta: 0,
      ticket,
      ticketDelta: 0,
      rate,
      rateDelta: 0,
      series,
    });
  } catch (e) {
    console.error('GET /api/stats/sales error:', e);
    res.status(500).json({ error: 'stats_failed' });
  }
});

// ===== Start =====
const port = process.env.PORT || 8080;
app.listen(port, () =>
  console.log(`API running on http://localhost:${port}`)
);
