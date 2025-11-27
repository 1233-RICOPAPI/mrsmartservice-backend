// api/auth.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "./db.js";

// Crea un admin por defecto si no existe
export async function seedAdminOnce() {
  try {
    const email = "admin@tienda.com";
    const pass = "Admin12345!"; // luego la cambias con el endpoint o en BD
    const hash = bcrypt.hashSync(pass, 10);

    await query(
      `INSERT INTO users(email, password_hash, role)
       VALUES($1, $2, 'admin')
       ON CONFLICT(email) DO NOTHING`,
      [email, hash]
    );

    console.log("✅ Admin seed listo (admin@tienda.com / Admin12345!)");
  } catch (err) {
    console.error("❌ Error en seedAdminOnce:", err.message);
  }
}

// Login de administrador (y futuros usuarios)
export async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "missing_credentials" });
    }

    // query() devuelve directamente un array
    const rows = await query("SELECT * FROM users WHERE email = $1", [email]);

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const user = rows[0];

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("❌ Falta JWT_SECRET en .env");
      return res.status(500).json({ error: "server_config_error" });
    }

    const token = jwt.sign(
      {
        sub: user.user_id,          // id principal
        user_id: user.user_id,      // redundante por comodidad
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({ token });
  } catch (err) {
    console.error("❌ Error en login:", err);
    return res.status(500).json({ error: "login_failed" });
  }
}

// Middleware para proteger rutas solo de admin
export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "token_required" });
  }

  if (!process.env.JWT_SECRET) {
    console.error("❌ Falta JWT_SECRET en .env");
    return res.status(500).json({ error: "server_config_error" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }

    req.user = payload;
    next();
  } catch (err) {
    console.error("❌ Token inválido:", err.message);
    return res.status(401).json({ error: "token_invalid" });
  }
}
