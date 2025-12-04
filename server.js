// api/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
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

// ================== CLOUDINARY ==================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight
app.use(express.json({ limit: '1mb' }));

// Servir archivos estáticos legacy (si aún tienes imágenes sueltas en /uploads)
app.use('/uploads', express.static('uploads'));

// ===== Multer (archivos en memoria, para Cloudinary) =====
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ===== Utils =====
const has = (v) => typeof v === 'string' && v.trim().length > 0;
const trimRightSlash = (u) => (u || '').trim().replace(/\/+$/, '');

// FRONT_URL base (para back_urls de MP)
function resolveFrontBase() {
  const env = trimRightSlash(process.env.FRONT_URL);
  if (has(env)) return env;

  // Fallback SOLO local
  const fallback = 'http://127.0.0.1:5500/Ecomerce/web';
  console.warn('⚠️ FRONT_URL no definido, usando fallback:', fallback);
  return fallback;
}

// back_urls para auto_return
function getBackUrls() {
  const base = resolveFrontBase();
  if (!base) return null;
  return {
    success: `${base}/carrito.html`,
    failure: `${base}/carrito.html`,
    pending: `${base}/carrito.html`,
  };
}

// ===== Mercado Pago =====
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

app.post('/api/auth/request-reset', requestPasswordReset);
app.post('/api/auth/reset-password', resetPassword);

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

// ================== CAMBIO DE CONTRASEÑA (propia) ==================
app.post('/api/users/change-password', requireStaff, async (req, res) => {
  try {
    const userId = req.user?.user_id ?? req.user?.sub ?? null;
    const { oldPassword, newPassword } = req.body || {};
    console.log('[change-password] userId=', userId);

    if (!userId) return res.status(401).json({ error: 'unauthorized' });
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
    if (!rows.length) return res.status(404).json({ error: 'user_not_found' });

    const user = rows[0];
    const ok = await bcrypt.compare(oldPassword, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'invalid_password' });

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

// ================== GESTIÓN DE USUARIOS PANEL ==================
// Ahora: SOLO crea empleados/invitados con rol USER
app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email) return res.status(400).json({ error: 'missing_email' });

    if (!password || typeof password !== 'string' || !password.trim().length) {
      return res.status(400).json({ error: 'missing_password' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'weak_password' });
    }

    const exists = await query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (exists.length) {
      return res.status(400).json({ error: 'email_in_use' });
    }

    const hash = await bcrypt.hash(password.trim(), 10);
    const finalRole = 'USER';

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

// Lista de usuarios administrativos (si la quieres seguir usando)
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

// ================== UPLOAD (Cloudinary) ==================
app.post(
  '/api/upload',
  requireAdmin,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'no_file' });

      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: 'mrsmartservice',
              resource_type: 'auto',
            },
            (err, uploaded) => {
              if (err) reject(err);
              else resolve(uploaded);
            }
          )
          .end(req.file.buffer);
      });

      res.json({ url: result.secure_url });
    } catch (e) {
      console.error('upload error:', e);
      res.status(500).json({ error: 'upload_failed' });
    }
  }
);

// ================== ADS (PUBLICIDAD HOME) ==================
app.get('/api/ads', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT ad_id, title, description, video_url, image_url, active, created_at
         FROM ads
        WHERE active = TRUE
        ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /api/ads error:', e);
    res.status(500).json({ error: 'ads_failed' });
  }
});

app.post('/api/ads', requireAdmin, async (req, res) => {
  try {
    const { title, description, video_url, image_url, active } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'missing_title' });
    }

    const rows = await query(
      `INSERT INTO ads (title, description, video_url, image_url, active)
       VALUES ($1, $2, $3, $4, COALESCE($5, TRUE))
       RETURNING ad_id, title, description, video_url, image_url, active, created_at`,
      [
        String(title).trim(),
        (description || '').trim(),
        (video_url || '').trim(),
        (image_url || '').trim(),
        typeof active === 'boolean' ? active : true,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('POST /api/ads error:', e);
    res.status(500).json({ error: 'ads_create_failed' });
  }
});

app.put('/api/ads/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'bad_id' });

    const fields = ['title', 'description', 'video_url', 'image_url', 'active'];
    const sets = [];
    const args = [];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        sets.push(`${f} = $${sets.length + 1}`);
        args.push(req.body[f]);
      }
    }

    if (!sets.length) {
      return res.status(400).json({ error: 'no_fields' });
    }

    sets.push(`updated_at = now()`);
    args.push(id);

    const rows = await query(
      `UPDATE ads
          SET ${sets.join(', ')}
        WHERE ad_id = $${args.length}
        RETURNING ad_id, title, description, video_url, image_url, active, created_at`,
      args
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'ad_not_found' });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error('PUT /api/ads/:id error:', e);
    res.status(500).json({ error: 'ads_update_failed' });
  }
});

app.delete('/api/ads/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'bad_id' });

    await query('DELETE FROM ads WHERE ad_id = $1', [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/ads/:id error:', e);
    res.status(500).json({ error: 'ads_delete_failed' });
  }
});

// ================== PRODUCTS CRUD ==================
app.get('/api/products', async (_req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM products WHERE active = TRUE ORDER BY product_id DESC'
    );

    const now = new Date();

    const data = rows.map((product) => {
      let discount = Number(product.discount_percent || 0);

      if (product.discount_start && product.discount_end) {
        const start = new Date(product.discount_start);
        const end = new Date(product.discount_end);

        if (now < start || now > end) {
          discount = 0; // fuera de rango → sin descuento
        }
      }

      return {
        ...product,
        discount_percent: discount,
      };
    });

    res.json(data);
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
      video_url,
      category,
      discount_start,
      discount_end,
    } = req.body;

    const rows = await query(
      `INSERT INTO products
         (name, price, stock, discount_percent, image_url, video_url, category, discount_start, discount_end)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        name,
        price,
        stock,
        discount_percent,
        image_url,
        video_url,
        category,
        discount_start || null,
        discount_end || null,
      ]
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
      'video_url',
      'category',
      'active',
      'discount_start',
      'discount_end',
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

// ================== RESEÑAS ==================
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

// ================== PAYMENTS / MERCADO PAGO ==================
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
        product_id: hasPid ? Number(i.product_id) : null,
        title: String(i.title || 'Producto'),
        unit_price: Number(i.unit_price || 0),
        quantity: Number(i.quantity || 1),
        currency_id: (i.currency_id || 'COP').toUpperCase(),
      };
    });

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

    // Validar stock y aplicar descuentos desde la BD
    const now = new Date();

    for (const item of norm) {
      if (item.product_id === null) continue; // ej: envío

      const rows = await query(
        `SELECT name, price, stock, discount_percent, discount_start, discount_end
           FROM products
          WHERE product_id = $1`,
        [item.product_id]
      );

      if (!rows.length) {
        return res
          .status(400)
          .json({ error: 'product_not_found', product_id: item.product_id });
      }

      const prod = rows[0];
      const stock = Number(prod.stock) || 0;
      if (stock < item.quantity) {
        return res
          .status(400)
          .json({ error: 'no_stock', product_id: item.product_id });
      }

      let finalPrice = Number(prod.price) || 0;
      let discount = Number(prod.discount_percent || 0);

      if (prod.discount_start && prod.discount_end) {
        const start = new Date(prod.discount_start);
        const end = new Date(prod.discount_end);
        if (now < start || now > end) {
          discount = 0;
        }
      }

      if (discount > 0) {
        finalPrice = finalPrice * (1 - discount / 100);
      }

      finalPrice = Math.round(finalPrice); // COP entero

      item.unit_price = finalPrice;
      item.title = prod.name || item.title;
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
        id: i.product_id !== null ? String(i.product_id) : 'EXTRA',
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

        // Descontar stock de productos reales
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
// ================== REPORTES FINANCIEROS (PYTHON) ==================
app.get('/api/reports/finanzas', requireAdmin, async (req, res) => {
  try {
    // format viene del front: 'pdf' o 'xlsx'
    const format = req.query.format === 'pdf' ? 'pdf' : 'xlsx';

    // URL base del microservicio Python (configurar en .env en Render)
    const pythonBase = process.env.PY_ANALYTICS_URL || 'http://127.0.0.1:5001';

    // Cabecera secreta para autenticar a Python (configurar REPORT_SECRET en .env)
    const reportSecret = process.env.REPORT_SECRET || '';

    const url = `${pythonBase}/reports/finanzas?formato=${encodeURIComponent(format)}`;

    const proxRes = await fetch(url, {
      method: 'GET',
      headers: {
        'X-REPORT-SECRET': reportSecret
      }
    });

    if (!proxRes.ok) {
      const txt = await proxRes.text().catch(()=>null);
      console.error('Python report failed', proxRes.status, txt);
      return res.status(502).json({ error: 'report_downstream_failed', status: proxRes.status });
    }

    // Forward headers and stream body
    const contentType = proxRes.headers.get('content-type') || 'application/octet-stream';
    const contentDisp = proxRes.headers.get('content-disposition') || `attachment; filename="reporte.${format}"`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', contentDisp);

    // pipe stream
    proxRes.body.pipe(res);
  } catch (err) {
    console.error('/api/reports/finanzas proxy error:', err);
    res.status(500).json({ error: 'report_proxy_error' });
  }
});



// ================== ORDERS (panel ventas) ==================
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

// ================== STATS (panel estadísticas) ==================
// Ahora SOLO ADMIN
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
