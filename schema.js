// api/schema.js
import { pool } from './db.js';

const SQL = `
-- ================== USERS ==================
CREATE TABLE IF NOT EXISTS users (
  user_id        SERIAL PRIMARY KEY,
  email          TEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'USER',
  created_at     TIMESTAMP NOT NULL DEFAULT now()
);

-- ================== PRODUCTS ==================
CREATE TABLE IF NOT EXISTS products (
  product_id       SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  description      TEXT,
  tech_sheet       TEXT,
  price            NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock            INTEGER       NOT NULL DEFAULT 0,
  discount_percent INTEGER       NOT NULL DEFAULT 0,
  category         TEXT,
  image_url        TEXT,
  video_url        TEXT,
  active           BOOLEAN       NOT NULL DEFAULT TRUE,
  discount_start   TIMESTAMP NULL,
  discount_end     TIMESTAMP NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP NOT NULL DEFAULT now()
);

-- ================== ADS / PUBLICIDAD ==================
CREATE TABLE IF NOT EXISTS ads (
  ad_id       SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  video_url   TEXT,
  image_url   TEXT,
  active      BOOLEAN   NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- ================== ORDERS ==================
CREATE TABLE IF NOT EXISTS orders (
  order_id        SERIAL PRIMARY KEY,
  status          TEXT NOT NULL DEFAULT 'pending',
  total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_id      TEXT,
  payer_email     TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- ================== ORDER ITEMS ==================
CREATE TABLE IF NOT EXISTS order_items (
  order_item_id SERIAL PRIMARY KEY,
  order_id      INTEGER NOT NULL REFERENCES orders(order_id)   ON DELETE CASCADE,
  product_id    INTEGER NOT NULL REFERENCES products(product_id),
  quantity      INTEGER NOT NULL DEFAULT 1,
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- ================== PASSWORD RESETS ==================
CREATE TABLE IF NOT EXISTS password_resets (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used       BOOLEAN  NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ================== PRODUCT REVIEWS ==================
CREATE TABLE IF NOT EXISTS product_reviews (
  review_id   SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- ================== VISTA STATS VENTAS DIARIAS ==================
CREATE OR REPLACE VIEW v_sales_daily AS
SELECT
  date(created_at)               AS day,
  COUNT(*)                       AS orders_count,
  COALESCE(SUM(total_amount), 0) AS total_amount
FROM orders
WHERE status = 'approved'
GROUP BY 1
ORDER BY 1 DESC;

-- ================== ÍNDICES ÚTILES ==================
CREATE INDEX IF NOT EXISTS idx_products_active_category
  ON products(active, category);

CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON orders(status, created_at);

CREATE INDEX IF NOT EXISTS idx_ads_active
  ON ads(active);

CREATE INDEX IF NOT EXISTS idx_password_resets_token
  ON password_resets(token);
`;

const ALTER_ORDERS_DOMICILIO = `
-- === EXTENDER ORDERS CON CAMPOS DE DOMICILIO ===
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS domicilio_modo      TEXT,
  ADD COLUMN IF NOT EXISTS domicilio_nombre    TEXT,
  ADD COLUMN IF NOT EXISTS domicilio_direccion TEXT,
  ADD COLUMN IF NOT EXISTS domicilio_barrio    TEXT,
  ADD COLUMN IF NOT EXISTS domicilio_ciudad    TEXT,
  ADD COLUMN IF NOT EXISTS domicilio_telefono  TEXT,
  ADD COLUMN IF NOT EXISTS domicilio_nota      TEXT,
  ADD COLUMN IF NOT EXISTS fecha_domicilio     TIMESTAMP,
  ADD COLUMN IF NOT EXISTS estado_domicilio    TEXT;
`;

const ALTER_PRODUCTS_TECH_SHEET = `
-- === EXTENDER PRODUCTS CON tech_sheet (compat con server.js) ===
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS tech_sheet TEXT;
`;

try {
  await pool.query(SQL);
  await pool.query(ALTER_PRODUCTS_TECH_SHEET);
  await pool.query(ALTER_ORDERS_DOMICILIO);
  console.log('✅ Esquema creado/actualizado OK');
} catch (e) {
  console.error('❌ Error aplicando schema:', e.message);
} finally {
  await pool.end();
}
