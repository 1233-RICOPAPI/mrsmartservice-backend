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

-- ================== SOFTWARES (CATÁLOGO) ==================
CREATE TABLE IF NOT EXISTS softwares (
  software_id                SERIAL PRIMARY KEY,
  name                       TEXT NOT NULL,
  short_description           TEXT,
  features                   TEXT,
  tags                       TEXT,
  price                      NUMERIC(12,2) NOT NULL DEFAULT 0,
  image_url                  TEXT,
  whatsapp_message_template  TEXT,
  active                     BOOLEAN   NOT NULL DEFAULT TRUE,
  created_at                 TIMESTAMP NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMP NOT NULL DEFAULT now()
);

-- ================== SOFTWARE CREDENTIALS (USUARIO/CLAVE POR SOFTWARE) ==================
CREATE TABLE IF NOT EXISTS software_credentials (
  credential_id  SERIAL PRIMARY KEY,
  software_id    INTEGER NOT NULL REFERENCES softwares(software_id) ON DELETE CASCADE,
  order_id       INTEGER NULL REFERENCES orders(order_id) ON DELETE SET NULL,
  username       TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS software_credentials_software_username_key
  ON software_credentials(software_id, username);
CREATE INDEX IF NOT EXISTS software_credentials_software_id_idx
  ON software_credentials(software_id);
CREATE INDEX IF NOT EXISTS software_credentials_order_id_idx
  ON software_credentials(order_id);

-- ================== LICENSES (POSTVENTA) ==================
CREATE TABLE IF NOT EXISTS licenses (
  license_id       SERIAL PRIMARY KEY,
  software_id      INTEGER NOT NULL REFERENCES softwares(software_id) ON DELETE CASCADE,

  customer_email   TEXT,
  customer_name    TEXT,
  customer_nit     TEXT,
  customer_company TEXT,

  license_type     TEXT NOT NULL DEFAULT 'PERPETUAL',
  major_max        INTEGER NOT NULL DEFAULT 1,
  max_sites        INTEGER NOT NULL DEFAULT 3,
  max_devices      INTEGER NOT NULL DEFAULT 6,
  expires_at       TIMESTAMP NULL,
  revoked          BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at       TIMESTAMP NULL,
  notes            TEXT,
  license_key      TEXT NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS licenses_software_id_idx ON licenses(software_id);

CREATE TABLE IF NOT EXISTS license_activations (
  activation_id  SERIAL PRIMARY KEY,
  license_id     INTEGER NOT NULL REFERENCES licenses(license_id) ON DELETE CASCADE,
  machine_id     TEXT NOT NULL,
  site_code      TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT now(),
  last_seen_at   TIMESTAMP NOT NULL DEFAULT now(),
  deactivated_at TIMESTAMP NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS license_activations_license_machine_key
  ON license_activations(license_id, machine_id);
CREATE INDEX IF NOT EXISTS license_activations_machine_id_idx ON license_activations(machine_id);

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
-- orders: columnas que pueden faltar si vienes de una DB antigua
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_nit TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_company TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_preference_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_init_point TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payer_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT now();
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT now();

-- domicilio/envío (opcional)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS domicilio_modo TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS domicilio_nombre TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS domicilio_direccion TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS domicilio_barrio TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS domicilio_ciudad TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS domicilio_telefono TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS domicilio_nota TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS domicilio_costo NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fecha_domicilio TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estado_domicilio TEXT;

-- products/ads: compatibilidad
ALTER TABLE products ADD COLUMN IF NOT EXISTS tech_sheet TEXT;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT now();
ALTER TABLE ads ADD COLUMN IF NOT EXISTS link_url TEXT;

-- softwares: compatibilidad
ALTER TABLE softwares ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE softwares ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE softwares ADD COLUMN IF NOT EXISTS features TEXT;
ALTER TABLE softwares ADD COLUMN IF NOT EXISTS tags TEXT;
ALTER TABLE softwares ADD COLUMN IF NOT EXISTS price NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE softwares ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE softwares ADD COLUMN IF NOT EXISTS whatsapp_message_template TEXT;
ALTER TABLE softwares ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE softwares ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT now();
ALTER TABLE softwares ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT now();

-- software_credentials: compatibilidad
CREATE TABLE IF NOT EXISTS software_credentials (
  credential_id  SERIAL PRIMARY KEY,
  software_id    INTEGER NOT NULL REFERENCES softwares(software_id) ON DELETE CASCADE,
  order_id       INTEGER NULL REFERENCES orders(order_id) ON DELETE SET NULL,
  username       TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT now()
);

-- Si la tabla ya existía (versiones previas), aseguramos la nueva columna y el FK.
ALTER TABLE software_credentials ADD COLUMN IF NOT EXISTS order_id INTEGER NULL;
DO $$
BEGIN
  ALTER TABLE software_credentials
    ADD CONSTRAINT software_credentials_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS software_credentials_software_username_key
  ON software_credentials(software_id, username);
CREATE INDEX IF NOT EXISTS software_credentials_software_id_idx
  ON software_credentials(software_id);
CREATE INDEX IF NOT EXISTS software_credentials_order_id_idx
  ON software_credentials(order_id);

-- licenses: compatibilidad
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS software_id INTEGER;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS customer_nit TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS customer_company TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS license_type TEXT NOT NULL DEFAULT 'PERPETUAL';
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS major_max INTEGER NOT NULL DEFAULT 1;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS max_sites INTEGER NOT NULL DEFAULT 3;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS max_devices INTEGER NOT NULL DEFAULT 6;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS revoked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP NULL;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS license_key TEXT;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT now();
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS licenses_software_id_idx ON licenses(software_id);

ALTER TABLE license_activations ADD COLUMN IF NOT EXISTS activation_id SERIAL;
ALTER TABLE license_activations ADD COLUMN IF NOT EXISTS license_id INTEGER;
ALTER TABLE license_activations ADD COLUMN IF NOT EXISTS machine_id TEXT;
ALTER TABLE license_activations ADD COLUMN IF NOT EXISTS site_code TEXT;
ALTER TABLE license_activations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT now();
ALTER TABLE license_activations ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP NOT NULL DEFAULT now();
ALTER TABLE license_activations ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP NULL;

CREATE UNIQUE INDEX IF NOT EXISTS license_activations_license_machine_key
  ON license_activations(license_id, machine_id);
CREATE INDEX IF NOT EXISTS license_activations_machine_id_idx ON license_activations(machine_id);

-- order_items: si la tabla ya existía de versiones anteriores, asegura columnas usadas por Prisma
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total_price NUMERIC(12,2) NOT NULL DEFAULT 0;

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
  try { await pool.end(); } catch {}
  process.exit(1);
});
