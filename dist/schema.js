// src/schema.ts - inicializa/actualiza el esquema de Postgres
import 'dotenv/config';
import { pool } from './common/db/db.pool.js';
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

-- ================== PRODUCT REVIEWS ==================
CREATE TABLE IF NOT EXISTS product_reviews (
  review_id   SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  rating      INTEGER NOT NULL DEFAULT 5,
  comment     TEXT,
  user_id     INTEGER NULL REFERENCES users(user_id) ON DELETE SET NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- ================== ADS / PUBLICIDAD ==================
CREATE TABLE IF NOT EXISTS ads (
  ad_id       SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  video_url   TEXT,
  image_url   TEXT,
  link_url    TEXT,
  active      BOOLEAN   NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- ================== ORDERS ==================
CREATE TABLE IF NOT EXISTS orders (
  order_id         SERIAL PRIMARY KEY,
  buyer_name       TEXT,
  buyer_email      TEXT,
  buyer_phone      TEXT,
  buyer_nit        TEXT,
  buyer_company    TEXT,
  status           TEXT NOT NULL DEFAULT 'PENDING',
  total_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method   TEXT,
  payment_id       TEXT,
  payment_status   TEXT,
  mp_preference_id TEXT,
  mp_init_point    TEXT,
  payer_email      TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP NOT NULL DEFAULT now(),

  -- domicilio/envío (puede no usarse)
  domicilio_modo      TEXT,
  domicilio_nombre    TEXT,
  domicilio_direccion TEXT,
  domicilio_barrio    TEXT,
  domicilio_ciudad    TEXT,
  domicilio_telefono  TEXT,
  domicilio_nota      TEXT,
  domicilio_costo     NUMERIC(12,2) NOT NULL DEFAULT 0,
  fecha_domicilio     TIMESTAMP,
  estado_domicilio    TEXT
);

-- ================== ORDER ITEMS ==================
CREATE TABLE IF NOT EXISTS order_items (
  order_item_id SERIAL PRIMARY KEY,
  order_id      INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id    INTEGER NOT NULL REFERENCES products(product_id),
  quantity      INTEGER NOT NULL DEFAULT 1,
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price   NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- ================== PASSWORD RESETS ==================
CREATE TABLE IF NOT EXISTS password_resets (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Índice único para compatibilidad con Prisma (token @unique)
CREATE UNIQUE INDEX IF NOT EXISTS password_resets_token_key ON password_resets(token);

-- ================== PATCHES (safe) ==================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payer_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT now();
ALTER TABLE products ADD COLUMN IF NOT EXISTS tech_sheet TEXT;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT now();
ALTER TABLE ads ADD COLUMN IF NOT EXISTS link_url TEXT;

ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS user_id INTEGER NULL REFERENCES users(user_id) ON DELETE SET NULL;

-- Compatibilidad con versiones antiguas de password_resets
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS id SERIAL;
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS used BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT now();

-- Prisma necesita token único para lookup por token
CREATE UNIQUE INDEX IF NOT EXISTS password_resets_token_key ON password_resets(token);

-- Si existía reset_id, rellenamos id para que el backend Nest (auth) funcione
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'password_resets'
      AND column_name = 'reset_id'
  ) THEN
    UPDATE password_resets SET id = reset_id WHERE id IS NULL AND reset_id IS NOT NULL;
  END IF;
END $$;
`;
async function main() {
    await pool.query(SQL);
    console.log('✅ Esquema creado/actualizado OK');
    await pool.end();
}
main().catch(async (e) => {
    console.error('❌ Error creando esquema:', e?.message || e);
    try {
        await pool.end();
    }
    catch { }
    process.exit(1);
});
//# sourceMappingURL=schema.js.map