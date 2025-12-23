
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { uploadImageBuffer } from './gcs.js';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import bcrypt from 'bcryptjs';
import { pool, query } from './db.js';
import {
  seedAdminOnce,
  login,
  requireAdmin,
  requireStaff,
  requireAuth,
  requestPasswordReset,
  resetPassword,
} from './auth.js';
import crypto from 'crypto';

const app = express();

/* =========================
   HELPERS
========================= */
const has = (v) => typeof v === 'string' && v.trim().length > 0;
const trimRightSlash = (u) => (u || '').trim().replace(/\/+$/, '');

function resolveFrontBase() {
  const env = trimRightSlash(process.env.FRONT_URL);
  if (has(env)) return env;

  // fallback SOLO local (no rompe prod si FRONT_URL falta)
  const fallback = 'https://mrsmartservice-decad.web.app'; // o tu front real
  console.warn('⚠️ FRONT_URL no definido, usando fallback:', fallback);
  return fallback;
}

function getBackUrls() {
  const base = resolveFrontBase();
  return {
    success: `${base}/carrito.html`,
    failure: `${base}/carrito.html`,
    pending: `${base}/carrito.html`,
  };
}

function normalizeCity(ciudad) {
  return (ciudad || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function isLocalCity(ciudad) {
  const c = normalizeCity(ciudad);
  return c === 'villavicencio';
}

/* =========================
   CORS
========================= */
const allowedOrigins = [
  process.env.FRONT_URL, // tu front principal (cuando lo definas)
  'https://mrsmartservice-decad.web.app',
  'https://mrsmartservice-decad.firebaseapp.com',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Cloud Run + curl/postman no mandan Origin => permitir
    if (!origin) return callback(null, true);

    // Si definiste FRONT_URL, restringimos a la lista
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Si NO hay FRONT_URL, mejor permitir (para no bloquearte mientras migras)
    if (!has(process.env.FRONT_URL)) return callback(null, true);

    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '1mb' }));

// Legacy estáticos
app.use('/uploads', express.static('uploads'));

/* =========================
   MERCADO PAGO
========================= */
if (!has(process.env.MP_ACCESS_TOKEN)) {
  console.error('❌ Falta MP_ACCESS_TOKEN en variables de entorno');
}
const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

/* =========================
   SEED ADMIN
========================= */
seedAdminOnce().catch((err) => console.error('seedAdminOnce error:', err));

/* =========================
   ROUTES BASICAS
========================= */

// IMPORTANTE: root para verificar que NO es placeholder
app.get('/', (_req, res) => {
  res.status(200).send('mrsmartservice API OK');
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/debug/env', (_req, res) => {
  res.json({
    has_access_token: has(process.env.MP_ACCESS_TOKEN),
    token_prefix: (process.env.MP_ACCESS_TOKEN || '').slice(0, 6),
    front_url: process.env.FRONT_URL || null,
  });
});

app.get('/api/debug/mp', async (_req, res) => {
  try {
    const back_urls = getBackUrls();

    const body = {
      items: [
        { title: 'Item Test', unit_price: 12345, quantity: 1, currency_id: 'COP' },
      ],
      binary_mode: true,
      back_urls,
    };

    const pref = new Preference(mp);
const payment = new Payment(mp);
    const out = await pref.create({ body });

    return res.json({
      ok: true,
      init_point: out.init_point,
      back_urls: body.back_urls,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || 'mp_debug_failed' });
  }
});

/* =========================
   AUTH
========================= */
app.post('/api/login', login);
app.post('/api/auth/request-reset', requestPasswordReset);
app.post('/api/auth/reset-password', resetPassword);

app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.user_id ?? req.user?.sub ?? null;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const rows = await query(
      `SELECT user_id, email, role, created_at FROM users WHERE user_id = $1`,
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

app.post('/api/users/change-password', requireStaff, async (req, res) => {
  try {
    const userId = req.user?.user_id ?? req.user?.sub ?? null;
    const { oldPassword, newPassword } = req.body || {};

    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'missing_fields' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'weak_password' });

    const rows = await query('SELECT user_id, password_hash FROM users WHERE user_id = $1', [userId]);
    if (!rows.length) return res.status(404).json({ error: 'user_not_found' });

    const ok = await bcrypt.compare(oldPassword, rows[0].password_hash);
    if (!ok) return res.status(400).json({ error: 'invalid_password' });

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [newHash, rows[0].user_id]);

    res.json({ success: true });
  } catch (e) {
    console.error('POST /api/users/change-password error:', e);
    res.status(500).json({ error: 'change_password_failed' });
  }
});

/* =========================
   USUARIOS DEL PANEL (ADMIN)
   - GET   /api/users
   - POST  /api/users
   - DELETE /api/users/:id
========================= */
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    // Solo listamos usuarios del panel con rol USER (los "adicionales")
    const rows = await query(
      `SELECT user_id, email, role, created_at
       FROM users
       WHERE role = 'USER'
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /api/users error:', e);
    res.status(500).json({ error: 'users_list_failed' });
  }
});

app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) return res.status(400).json({ error: 'missing_fields' });
    const normalizedEmail = String(email).trim().toLowerCase();

    // Límite: hasta 3 usuarios adicionales con rol USER (ajusta si lo necesitas)
    const countRows = await query(`SELECT COUNT(*)::int AS c FROM users WHERE role = 'USER'`);
    const currentCount = countRows?.[0]?.c ?? 0;
    if (currentCount >= 3) return res.status(400).json({ error: 'user_limit_reached' });

    const exists = await query(`SELECT 1 FROM users WHERE email = $1`, [normalizedEmail]);
    if (exists.length) return res.status(400).json({ error: 'email_in_use' });

    if (String(password).length < 8) return res.status(400).json({ error: 'weak_password' });

    const password_hash = await bcrypt.hash(String(password), 10);

    const rows = await query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'USER')
       RETURNING user_id, email, role, created_at`,
      [normalizedEmail, password_hash]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('POST /api/users error:', e);
    res.status(500).json({ error: 'user_create_failed' });
  }
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid_id' });

    // No permitir borrar el usuario actual
    const meId = req.user?.user_id ?? req.user?.sub ?? null;
    if (meId && Number(meId) === id) return res.status(400).json({ error: 'cannot_delete_self' });

    const rows = await query(`SELECT user_id, email, role FROM users WHERE user_id = $1`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'user_not_found' });

    // Bloqueo de cuentas seed (ajusta si cambiaste los correos seed)
    const email = String(rows[0].email || '').toLowerCase();
    const role = String(rows[0].role || '').toUpperCase();
    if (email === 'admin@tienda.com' || email === 'dev@tienda.com' || role === 'ADMIN' || role === 'DEV_ADMIN') {
      return res.status(403).json({ error: 'cannot_delete_seed' });
    }

    await query(`DELETE FROM users WHERE user_id = $1`, [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/users/:id error:', e);
    res.status(500).json({ error: 'user_delete_failed' });
  }
});

/* =========================
   UPLOAD GCS
========================= */
const storage = multer.memoryStorage();

/**
 * IMPORTANTE (Cloud Run):
 * - Límite de request ~32MB. No subas videos muy grandes.
 * - Aceptamos "image" (actual) y también "file" por compatibilidad.
 */
const upload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.UPLOAD_MAX_BYTES || 25 * 1024 * 1024), // 25MB por defecto
  },
});

const uploadAny = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

app.post('/api/upload', requireStaff, uploadAny, async (req, res) => {
  try {
    const file =
      (req.files?.image && req.files.image[0]) ||
      (req.files?.file && req.files.file[0]) ||
      null;

    if (!file) return res.status(400).json({ error: 'no_file' });

    const baseFolder = process.env.GCS_UPLOAD_FOLDER || 'mrsmartservice';
    const subFolder = String(file.mimetype || '').startsWith('video/') ? 'videos' : 'images';

    const result = await uploadImageBuffer({
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      folder: `${baseFolder}/${subFolder}`,
    });

    res.json({ url: result.url, object: result.object });
  } catch (e) {
    console.error('upload error:', e?.stack || e);
    res.status(500).json({ error: 'upload_failed', message: e?.message || String(e) });
  }
});
/* =========================================
   ADS (PUBLICIDAD HOME)
========================================= */

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

// Listado completo de anuncios para el panel (activos e inactivos)
app.get('/api/ads/all', requireStaff, async (_req, res) => {
  try {
    const rows = await query(
      `SELECT ad_id, title, description, video_url, image_url, active, created_at
         FROM ads
        ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /api/ads/all error:', e);
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

/* =========================================
   PRODUCTS CRUD + REVIEWS
========================================= */

// Productos con rating promedio y descuento validado por fechas
app.get('/api/products', async (_req, res) => {
  try {
    const rows = await query(
      `
      SELECT
        p.*,
        COALESCE(r.avg_rating, 0)::float  AS avg_rating,
        COALESCE(r.review_count, 0)::int  AS review_count
      FROM products p
      LEFT JOIN (
        SELECT
          product_id,
          AVG(rating)::float AS avg_rating,
          COUNT(*)::int      AS review_count
        FROM product_reviews
        GROUP BY product_id
      ) r ON r.product_id = p.product_id
      WHERE p.active = TRUE
      ORDER BY p.product_id DESC
      `
    );

    const now = new Date();

    const data = rows.map((product) => {
      let discount = Number(product.discount_percent || 0);

      if (product.discount_start && product.discount_end) {
        const start = new Date(product.discount_start);
        const end   = new Date(product.discount_end);

        // fuera de rango → sin descuento
        if (now < start || now > end) {
          discount = 0;
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

// Crear producto
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
      description,
      tech_sheet,
      discount_start,
      discount_end,
    } = req.body;

    const rows = await query(
      `INSERT INTO products
         (name, price, stock, discount_percent, image_url, video_url, category, description, tech_sheet, discount_start, discount_end)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        name,
        price,
        stock,
        discount_percent,
        image_url,
        video_url,
        category,
        description || null,
        tech_sheet || null,
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

// Actualizar producto
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
      'description',
      'tech_sheet',
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
         SET ${sets.join(',')}, updated_at=NOW()
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

// Borrar producto (FIX DEFINITIVO)
app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'invalid_id' });
  }

  try {
    // Intento de borrado físico
    const result = await query(
      'DELETE FROM products WHERE product_id = $1 RETURNING product_id',
      [id]
    );

    if (result.length) {
      return res.json({ ok: true, deleted: true });
    }

    // Si no se borró nada, intentamos soft delete
    await query(
      'UPDATE products SET active = false WHERE product_id = $1',
      [id]
    );

    return res.json({ ok: true, deleted: false, softDeleted: true });
  } catch (e) {
    console.error('DELETE /api/products error:', e);
    return res.status(500).json({ error: 'product_delete_failed' });
  }
});


// Listar reseñas de un producto
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'bad_id' });

    const rows = await query(
      `SELECT review_id, author_name AS name, rating, comment, created_at
         FROM product_reviews
        WHERE product_id = $1
        ORDER BY created_at DESC`,
      [id]
    );

    res.json(rows);
  } catch (e) {
    console.error('GET /api/products/:id/reviews error:', e);
    res.status(500).json({ error: 'reviews_failed' });
  }
});

// Crear reseña
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

/* =========================================
   PAYMENTS / MERCADO PAGO
========================================= */

app.post('/api/payments/create', async (req, res) => {
  try {
    if (!has(process.env.MP_ACCESS_TOKEN)) {
      return res.status(500).json({ error: 'missing_access_token' });
    }

    const { items = [], shipping = null } = req.body;
    if (!items.length) return res.status(400).json({ error: 'no_items' });

    // Normalizar items
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

    // ===== Datos de domicilio / coordinadora =====
    const baseMode     = shipping?.mode || null;   // 'domicilio' o null
    const domNombre    = shipping?.nombre || null;
    const domDireccion = shipping?.direccion || null;
    const domBarrio    = shipping?.barrio || null;
    const domCiudad    = shipping?.ciudad || null;
    const domTelefono  = shipping?.telefono || null;
    const domNota      = shipping?.nota || null;

    // costo y modo de carrier que vienen del front (opcional)
    const shippingCost = Number(shipping?.shipping_cost || 0) || 0;
    const rawCarrier   = (shipping?.carrier_mode || shipping?.carrier || '')
      .toLowerCase() || null;

    // modo final en DB:
    //  - null           => retiro en punto
    //  - 'local'        => domicilio local (Vcio / Acacías)
    //  - 'coordinadora' => envío por Coordinadora (otras ciudades)
    let domModo   = null;
    let fechaDom  = null;
    let estadoDom = null;

    if (baseMode === 'domicilio') {
      if (rawCarrier === 'local' || rawCarrier === 'coordinadora') {
        domModo = rawCarrier;
      } else {
        const esLocal = isLocalCity(domCiudad || '');
        domModo = esLocal ? 'local' : 'coordinadora';
      }

      // Importante: el domicilio NO debe quedar pendiente hasta que el pago se apruebe.
      // Guardamos la información de envío, pero dejamos estado/fecha en NULL.
      fechaDom  = null;
      estadoDom = null;
    } else {
      domModo   = null;
      fechaDom  = null;
      estadoDom = null;
    }

    const back_urls = getBackUrls();
    console.log('🟢 Back URLs (create):', back_urls);
    if (!back_urls) return res.status(500).json({ error: 'missing_front_url' });

    // Base pública (Cloud Run) para construir notification_url del webhook
    // Preferimos PUBLIC_API_URL, y si no existe la inferimos desde headers.
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https')
      .split(',')[0]
      .trim();
    const host = String(req.headers['x-forwarded-host'] || req.get('host') || '')
      .split(',')[0]
      .trim();
    const publicBase = (process.env.PUBLIC_API_URL || (host ? `${proto}://${host}` : '')).replace(/\/$/, '');

    // Total que registra la orden (solo productos)
    const total = norm.reduce(
      (a, b) => a + b.unit_price * b.quantity,
      0
    );

    // ===== Guardar orden + items =====
    const client = await pool.connect();
    let orderId;
    try {
      await client.query('BEGIN');

      const orderRes = await client.query(
        `INSERT INTO orders(
           status,
           total_amount,
           domicilio_modo,
           domicilio_nombre,
           domicilio_direccion,
           domicilio_barrio,
           domicilio_ciudad,
           domicilio_telefono,
           domicilio_nota,
           fecha_domicilio,
           estado_domicilio
         )
         VALUES(
           'initiated',
           $1,
           $2,$3,$4,$5,$6,$7,$8,$9,$10
         )
         RETURNING order_id`,
        [
          total,
          domModo,
          domNombre,
          domDireccion,
          domBarrio,
          domCiudad,
          domTelefono,
          domNota,
          fechaDom,
          estadoDom,
        ]
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

    // ===== Preferencia de Mercado Pago =====
    const body = {
      items: norm.map((i) => ({
        id: i.product_id !== null ? String(i.product_id) : 'EXTRA',
        title: i.title,
        unit_price: i.unit_price,
        quantity: i.quantity,
        currency_id: i.currency_id,
      })),
      external_reference: String(orderId),
      notification_url: publicBase ? `${publicBase}/api/payments/webhook` : undefined,
      binary_mode: true,
      back_urls,
      metadata: {
        ts: Date.now(),
        order_id: orderId,
        carrier_mode: rawCarrier || domModo,
        shipping_cost: shippingCost,
      },
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


async function processPaymentAndMaybeApprove({ orderId, paymentId, paymentStatus, payerEmail, items }) {
  // Normalizamos estados
  const status = String(paymentStatus || '').toLowerCase();

  // Solo nos interesa approved/rejected/cancelled/charged_back/refunded
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT order_id, status, payment_id, domicilio_modo, estado_domicilio FROM orders WHERE order_id = $1 FOR UPDATE',
      [orderId]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return { updated: false, reason: 'order_not_found' };
    }

    const order = rows[0];
    const prevStatus = order.status;
    const prevPaymentId = order.payment_id;

    // Si ya está aprobado y ya tiene payment_id, no hacemos nada (idempotente)
    if (prevStatus === 'approved' && prevPaymentId) {
      await client.query('COMMIT');
      return { updated: false, status: prevStatus };
    }

    let newStatus = prevStatus;
    if (status === 'approved') newStatus = 'approved';
    else if (status === 'rejected') newStatus = 'rejected';
    else if (status === 'cancelled') newStatus = 'cancelled';
    else if (status) newStatus = status;

    await client.query(
      `UPDATE orders
         SET status = $1,
             payment_id = $2,
             payer_email = COALESCE($3, payer_email),
             updated_at = NOW()
       WHERE order_id = $4`,
      [newStatus, paymentId || prevPaymentId, payerEmail, orderId]
    );

    // Activar domicilio SOLO si el pago quedó aprobado
    if (newStatus === 'approved' && order.domicilio_modo && !order.estado_domicilio) {
      await client.query(
        `UPDATE orders
           SET estado_domicilio = 'pendiente',
               fecha_domicilio = NOW()
         WHERE order_id = $1`,
        [orderId]
      );
    }

    // Descontar stock SOLO al pasar a approved por primera vez
    if (newStatus === 'approved' && prevStatus !== 'approved') {
      for (const it of items || []) {
        const pid = Number(it.id);
        const qty = Number(it.quantity);
        if (!Number.isFinite(pid) || !Number.isFinite(qty) || qty <= 0) continue;
        await client.query('UPDATE products SET stock = stock - $1 WHERE product_id = $2', [qty, pid]);
      }
    }

    await client.query('COMMIT');
    return { updated: true, status: newStatus };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

app.post('/api/payments/webhook', async (req, res) => {
  try {
    const paymentId = Number(
      req.query?.id ||
        req.body?.data?.id ||
        req.body?.id ||
        req.body?.payment_id ||
        req.body?.paymentId
    );

    // Algunos pings llegan sin id: no es error.
    if (!paymentId) return res.status(200).json({ ok: true, ignored: true });

    const pay = await payment.get({ id: Number(paymentId) });
    const p = pay?.response || pay;
    if (!p) return res.status(200).json({ ok: true, ignored: true });

    // order_id desde external_reference o metadata.order_id
    const orderId = Number(p.external_reference || p.metadata?.order_id);
    if (!orderId) return res.status(200).json({ ok: true, ignored: true });

    const result = await processPaymentAndMaybeApprove({
      orderId,
      paymentId: Number(paymentId),
      paymentStatus: String(p.status || ''),
      payerEmail: p.payer?.email || null,
      items: p.additional_info?.items || [],
    });

    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('webhook error', err);
    // MP reintenta; respondemos 200 para no saturar si hay error temporal
    return res.status(200).json({ ok: true });
  }
});

// Confirmación post-pago: el cliente vuelve desde MP y validamos el payment_id contra MP
app.post('/api/payments/confirm', async (req, res) => {
  try {
    const paymentId = Number(req.body?.payment_id || req.body?.collection_id || req.query?.payment_id || req.query?.collection_id);
    if (!paymentId) return res.status(400).json({ error: 'missing_payment_id' });

    let pay;
try {
  pay = await payment.get({ id: Number(paymentId) });
} catch (e) {
  // MercadoPago devuelve 404 cuando no encuentra el pago (o token equivocado)
  const status = e?.status || e?.response?.status;
  if (status === 404) return res.status(400).json({ error: 'payment_not_found' });
  console.error('mp payment.get error', e);
  return res.status(500).json({ error: 'confirm_failed', message: e?.message || String(e) });
}
const p = pay?.response || pay;
if (!p) return res.status(400).json({ error: 'payment_not_found' });
const orderId = Number(p.external_reference || p.metadata?.order_id);
    if (!orderId) return res.status(400).json({ error: 'missing_order_reference' });

    const result = await processPaymentAndMaybeApprove({
      orderId,
      paymentId,
      paymentStatus: String(p.status || ''),
      payerEmail: p.payer?.email || null,
      items: p.additional_info?.items || [],
    });

    // Armar link de factura imprimible (público con token)
    const token = createInvoiceToken(orderId);
    const front = process.env.FRONT_URL || '';
    const invoice_url = front ? `${front.replace(/\/$/, '')}/factura.html?order_id=${orderId}&token=${token}` : null;

    return res.json({ ok: true, order_id: orderId, payment_id: paymentId, status: result.status, invoice_url });
  } catch (err) {
    console.error('confirm error', err);
    return res.status(500).json({ error: 'confirm_failed', message: err?.message || String(err) });
  }
});

// Token simple para compartir factura sin login (expira en 7 días)
function createInvoiceToken(orderId, ttlSeconds = 7 * 24 * 3600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${orderId}.${exp}`;
  const secret = process.env.JWT_SECRET || 'dev';
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyInvoiceToken(orderId, token) {
  try {
    const [oid, exp, sig] = String(token || '').split('.');
    if (Number(oid) !== Number(orderId)) return false;
    if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
    const payload = `${oid}.${exp}`;
    const secret = process.env.JWT_SECRET || 'dev';
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    return expected === sig;
  } catch {
    return false;
  }
}

// JSON público para renderizar factura imprimible en el frontend
app.get('/api/invoices/:orderId', async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);
    const token = req.query.token;
    if (!orderId || !token || !verifyInvoiceToken(orderId, token)) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const { rows: orders } = await query(
      `SELECT order_id, customer_name, customer_email, customer_phone, customer_city, customer_address,
              domicilio_modo, domicilio_costo, total_amount, status, created_at
       FROM orders WHERE order_id = $1`,
      [orderId]
    );
    if (!orders.length) return res.status(404).json({ error: 'not_found' });

    const { rows: items } = await query(
      `SELECT oi.product_id, p.name, oi.quantity, oi.unit_price
       FROM order_items oi
       JOIN products p ON p.product_id = oi.product_id
       WHERE oi.order_id = $1
       ORDER BY oi.order_item_id ASC`,
      [orderId]
    );

    return res.json({
      company: {
        name: 'MR SmartService',
        phone: '+57 301 419 0633',
        email: 'yesfri@hotmail.es',
      },
      order: orders[0],
      items,
    });
  } catch (err) {
    console.error('invoice error', err);
    return res.status(500).json({ error: 'invoice_failed', message: err?.message || String(err) });
  }
});


/* =========================================
   REPORTES FINANCIEROS (MICROSERVICIO PYTHON)
========================================= */

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
        'X-REPORT-SECRET': reportSecret,
      },
    });

    if (!proxRes.ok) {
      const txt = await proxRes.text().catch(() => null);
      console.error('Python report failed', proxRes.status, txt);
      return res
        .status(502)
        .json({ error: 'report_downstream_failed', status: proxRes.status });
    }

    const contentType =
      proxRes.headers.get('content-type') || 'application/octet-stream';
    const contentDisp =
      proxRes.headers.get('content-disposition') ||
      `attachment; filename="reporte.${format}"`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', contentDisp);

    proxRes.body.pipe(res);
  } catch (err) {
    console.error('/api/reports/finanzas proxy error:', err);
    res.status(500).json({ error: 'report_proxy_error' });
  }
});

/* =========================================
   ORDERS (VENTAS / DOMICILIOS)
========================================= */

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
        'Cliente' AS customer,
        domicilio_modo,
        domicilio_nombre,
        domicilio_direccion,
        domicilio_barrio,
        domicilio_ciudad,
        domicilio_telefono,
        domicilio_nota,
        fecha_domicilio,
        estado_domicilio
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

/* =========================================
   STATS (ESTADÍSTICAS)
========================================= */

// Solo staff (ADMIN / DEV_ADMIN / STAFF)
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
      FROM orders WHERE status <> 'initiated'
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

/* =========================
   START SERVER (Cloud Run)
========================= */
const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`API running on port ${port}`));