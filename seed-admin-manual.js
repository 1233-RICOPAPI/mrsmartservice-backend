// api/seed-admin-manual.cjs
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./db.js');

async function main() {
  const email = 'admin@tienda.com';
  const pass  = 'Admin12345!';
  const hash  = bcrypt.hashSync(pass, 10);

  try {
    const client = await pool.connect();

    await client.query(`
      INSERT INTO users(email, password_hash, role)
      VALUES ($1, $2, 'admin')
      ON CONFLICT(email)
      DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'
    `, [email, hash]);

    console.log('✅ Admin creado/actualizado correctamente');
    client.release();
  } catch (err) {
    console.error('❌ Error creando admin:', err);
  } finally {
    await pool.end();
  }
}

main();
