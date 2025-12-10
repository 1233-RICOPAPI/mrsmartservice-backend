// api/auth.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { query } from "./db.js";

/**
 * Seed inicial:
 *  - admin full: admin@tienda.com / Admin12345!
 *  - dev:        dev@tienda.com   / Dev12345!
 */
export async function seedAdminOnce() {
  try {
    const adminEmail = "admin@tienda.com";
    const adminPass  = "Admin12345!";
    const devEmail   = "dev@tienda.com";
    const devPass    = "Dev12345!";

    const adminHash = bcrypt.hashSync(adminPass, 10);
    const devHash   = bcrypt.hashSync(devPass, 10);

    // ADMIN base
    await query(
      `INSERT INTO users(email, password_hash, role)
       VALUES($1, $2, 'ADMIN')
       ON CONFLICT(email) DO NOTHING`,
      [adminEmail, adminHash]
    );

    // DEV_ADMIN base
    await query(
      `INSERT INTO users(email, password_hash, role)
       VALUES($1, $2, 'DEV_ADMIN')
       ON CONFLICT(email) DO NOTHING`,
      [devEmail, devHash]
    );

  console.log("✅ Seed usuarios listo (creados si no existían):");
  console.log("   Admin:", adminEmail);
  console.log("   Dev:  ", devEmail);
// 🔒 No mostramos las contraseñas en consola.

  } catch (err) {
    console.error("❌ Error en seedAdminOnce:", err.message);
  }
}

/* ================== LOGIN ================== */
// POST /api/login
export async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "missing_credentials" });
    }

    const rows = await query("SELECT * FROM users WHERE email = $1", [email]);
    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const user = rows[0];
    const ok   = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("❌ Falta JWT_SECRET en .env");
      return res.status(500).json({ error: "server_config_error" });
    }

    const payload = {
      sub:     user.user_id,
      user_id: user.user_id,
      email:   user.email,
<<<<<<< HEAD
      role:    user.role, // ADMIN / DEV_ADMIN / USER
=======
      role:    user.role, // puede ser ADMIN / DEV_ADMIN / STAFF / USER
>>>>>>> 7d6516c (Cambios nuevos)
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "8h",
    });

    return res.json({ token, role: user.role, email: user.email });
  } catch (err) {
    console.error("❌ Error en login:", err);
    return res.status(500).json({ error: "login_failed" });
  }
}

/* ================== MIDDLEWARES ================== */

// 🔒 requireAuth: cualquier usuario logueado (USER, ADMIN, etc.)
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "no_token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // user_id, email, role, etc.
    next();
  } catch (err) {
    console.error("❌ Token inválido:", err.message);
    return res.status(401).json({ error: "token_invalid" });
  }
}

// 🔒 requireAdmin: solo ADMIN y DEV_ADMIN (crear productos, anuncios, etc.)
export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: "no_token" });

  try {
    const payload   = jwt.verify(token, process.env.JWT_SECRET);
    const roleUpper = String(payload.role || "").toUpperCase();

    if (!["ADMIN", "DEV_ADMIN"].includes(roleUpper)) {
      return res.status(403).json({ error: "forbidden" });
    }
    req.user = payload;
    next();
  } catch (err) {
    console.error("❌ Token inválido:", err.message);
    return res.status(401).json({ error: "token_invalid" });
  }
}

// 🔒 requireStaff: ADMIN + DEV_ADMIN + STAFF (stats, usuarios, perfil…)
//   NO permite USER.
export function requireStaff(req, res, next) {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: "no_token" });

  try {
    const payload   = jwt.verify(token, process.env.JWT_SECRET);
    const roleUpper = String(payload.role || "").toUpperCase();

    const allowed = ["ADMIN", "DEV_ADMIN", "STAFF"]; // NO USER

    if (!allowed.includes(roleUpper)) {
      return res.status(403).json({ error: "forbidden" });
    }

    req.user = payload;
    next();
  } catch (err) {
    console.error("❌ Token inválido:", err.message);
    return res.status(401).json({ error: "token_invalid" });
  }
}

/* ============ RESET DE CONTRASEÑA (ADMIN / DEV) ============ */

/**
 * Helper para base del front (Netlify o local)
 */
function getFrontBase() {
  const env = (process.env.FRONT_URL || "").trim().replace(/\/+$/, "");
  if (env) return env; // producción (Netlify) o lo que tengas configurado
  // Fallback local
  return "http://127.0.0.1:5500/Ecomerce/web";
}

/**
 * POST /api/auth/request-reset
 * Body: { email }
 *
 * - Solo genera link si el usuario existe y es ADMIN o DEV_ADMIN.
 * - Siempre responde { ok: true } para no revelar si el correo existe.
 * - En desarrollo (NODE_ENV !== 'production'), devuelve resetUrl para debug.
 */
export async function requestPasswordReset(req, res) {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: "email_required" });
  }

  try {
    const rows = await query(
      `SELECT user_id, role, email FROM users WHERE email = $1`,
      [email]
    );

    // Respuesta genérica si no existe
    if (!rows.length) {
      return res.json({ ok: true });
    }

    const user      = rows[0];
    const roleUpper = String(user.role || "").toUpperCase();

    // Solo permitimos reset a staff (ADMIN / DEV_ADMIN)
    if (!["ADMIN", "DEV_ADMIN"].includes(roleUpper)) {
      // Aquí podrías devolver 403 si quieres mensaje especial:
      // return res.status(403).json({ error: "only_staff_can_reset" });
      return res.json({ ok: true });
    }

    const token     = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 min

    await query(
      `INSERT INTO password_resets (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.user_id, token, expiresAt]
    );

    const base     = getFrontBase();
    const resetUrl = `${base}/reset-password.html?token=${token}`;

    const isDev =
      (process.env.NODE_ENV || "").toLowerCase() !== "production";

    const hasSMTP =
      !!process.env.SMTP_HOST &&
      !!process.env.SMTP_USER &&
      !!process.env.SMTP_PASS;

    if (hasSMTP) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false, // 587 = STARTTLS
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"MR SmartService" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Recupera tu contraseña - MR SmartService",
        html: `
          <p>Hola,</p>
          <p>Has solicitado restablecer tu contraseña en <strong>MR SmartService</strong>.</p>
          <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
          <p>
            <a href="${resetUrl}" style="
              background:#007bff;
              color:#fff;
              padding:10px 18px;
              border-radius:4px;
              text-decoration:none;
              display:inline-block;">
              Restablecer contraseña
            </a>
          </p>
          <p>O copia y pega este enlace en tu navegador:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>Si tú no solicitaste esto, puedes ignorar este correo.</p>
        `,
      });
    } else {
      console.error("❌ Faltan variables SMTP en .env (modo debug sin correo)");
    }

    // En producción: no exponemos el enlace
    // En desarrollo: lo devolvemos para que lo veas en la consola JS del front
    return res.json({
      ok: true,
      resetUrl: isDev ? resetUrl : undefined,
    });
  } catch (err) {
    console.error("❌ requestPasswordReset error:", err);
    // No damos detalles al front para no filtrar info
    return res.status(500).json({ error: "server_error" });
  }
}

/**
 * POST /api/auth/reset-password
 * Body: { token, password }
 *
 * - Valida token, expiración y que no esté usado.
 * - Actualiza password_hash del usuario.
 * - Marca el token como usado.
 */
export async function resetPassword(req, res) {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ error: "bad_request" });
  }

  try {
    const rows = await query(
      `SELECT id, user_id, expires_at, used
       FROM password_resets
       WHERE token = $1`,
      [token]
    );

    if (!rows.length) {
      return res.status(400).json({ error: "invalid_token" });
    }

    const row     = rows[0];
    const expired = new Date(row.expires_at) < new Date();

    if (row.used || expired) {
      return res.status(400).json({ error: "expired_token" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "weak_password" });
    }

    const hash = await bcrypt.hash(password, 10);

    await query(
      `UPDATE users SET password_hash = $1 WHERE user_id = $2`,
      [hash, row.user_id]
    );
    await query(
      `UPDATE password_resets SET used = TRUE WHERE id = $1`,
      [row.id]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ resetPassword error:", err);
    return res.status(500).json({ error: "server_error" });
  }
}
