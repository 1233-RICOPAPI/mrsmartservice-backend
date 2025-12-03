// api/schema.js
import { pool } from './db.js';

const SQL = `
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  product_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  discount_percent INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  category TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  order_id SERIAL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_id TEXT,
  payer_email TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  -- product_id PUEDE SER NULL para líneas especiales (ej: envío a domicilio)
  product_id INTEGER REFERENCES products(product_id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- Reseñas por producto
CREATE TABLE IF NOT EXISTS product_reviews (
  review_id   SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- Vista simple para stats
CREATE OR REPLACE VIEW v_sales_daily AS
SELECT
  date(created_at) AS day,
  count(*)          AS orders_count,
  sum(total_amount) AS total_amount
FROM orders
WHERE status = 'approved'
GROUP BY 1
ORDER BY 1 DESC;
`;

try {
  await pool.query(SQL);
  console.log('✅ Esquema creado/actualizado OK');
} catch (e) {
  console.error('❌ Error aplicando schema:', e.message);
} finally {
  await pool.end();
}
