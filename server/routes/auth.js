// server/routes/auth.js (DB ONLY)
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();
if (!pool)
  throw new Error("DATABASE_URL requerido: este auth router es sólo para DB.");

const JWT_SECRET = (process.env.JWT_SECRET || "dev_secret").trim();
const IS_PROD = process.env.NODE_ENV === "production";

// rol por defecto si en la DB está null o no viene nada
const DEFAULT_ROLE = "client";

const sign = (u) =>
  jwt.sign(
    {
      id: u.id,
      email: u.email,
      role: u.role || DEFAULT_ROLE,
      name: u.name,
      points: u.points || 0,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

const norm = (e) =>
  String(e || "")
    .trim()
    .toLowerCase();

/* /me */
router.get("/me", async (req, res) => {
  try {
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    const token = req.cookies?.token || bearer;
    if (!token) return res.json({ user: null });
    const payload = jwt.verify(token, JWT_SECRET);

    const q = await pool.query(
      `SELECT id, name, email, role, points, created_at FROM app_user WHERE id = $1`,
      [payload.id]
    );
    if (q.rowCount === 0) return res.json({ user: null });

    const user = q.rows[0];
    if (!user.role) user.role = DEFAULT_ROLE;

    res.json({ user });
  } catch {
    res.json({ user: null });
  }
});

/* register */
router.post("/register", async (req, res) => {
  // ignoramos role del body: siempre cliente
  let { name, email, password } = req.body || {};
  const role = DEFAULT_ROLE;

  if (!name || !email || !password)
    return res.status(400).json({ error: "Missing fields" });
  email = norm(email);

  try {
    const exists = await pool.query(
      `SELECT 1 FROM app_user WHERE LOWER(email) = $1`,
      [email]
    );
    if (exists.rowCount > 0)
      return res.status(409).json({ error: "Email in use" });

    const hash = await bcrypt.hash(password, 10);
    const ins = await pool.query(
      `INSERT INTO app_user (name, email, password_hash, role, points)
       VALUES ($1,$2,$3,$4,0)
       RETURNING id, name, email, role, points, created_at`,
      [name, email, hash, role]
    );
    const user = ins.rows[0];
    if (!user.role) user.role = DEFAULT_ROLE;

    const token = sign(user);
    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
    res.json({ user, token });
  } catch (e) {
    console.error("POST /auth/register", e);
    res.status(500).json({ error: "DB error" });
  }
});

/* login */
router.post("/login", async (req, res) => {
  let { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "Missing fields" });
  email = norm(email);

  try {
    const q = await pool.query(
      `SELECT id, name, email, role, points, password_hash
         FROM app_user
        WHERE LOWER(email) = $1`,
      [email]
    );
    if (q.rowCount === 0)
      return res.status(401).json({ error: "Invalid credentials" });

    const u = q.rows[0];
    if (!u.password_hash || u.password_hash.length < 55) {
      console.warn(
        "[auth/login] password_hash inválido/truncado para",
        email,
        "len=",
        u.password_hash?.length || 0
      );
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const user = {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role || DEFAULT_ROLE,
      points: u.points,
    };
    const token = sign(user);
    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
    res.json({ user, token });
  } catch (e) {
    console.error("POST /auth/login", e);
    res.status(500).json({ error: "DB error" });
  }
});

/* logout */
router.post("/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

/* ===== DEV ONLY ===== */
router.get("/dev-users", async (_req, res) => {
  if (IS_PROD)
    return res.status(403).json({ error: "Forbidden in production" });
  try {
    const q = await pool.query(
      `SELECT id, name, email, role, points, created_at, LENGTH(password_hash) AS hash_len
         FROM app_user
     ORDER BY id ASC`
    );
    res.json(q.rows);
  } catch (e) {
    console.error("GET /auth/dev-users", e);
    res.status(500).json({ error: "DB error" });
  }
});

router.post("/dev-set-password", async (req, res) => {
  if (IS_PROD)
    return res.status(403).json({ error: "Forbidden in production" });
  try {
    let { email, newPassword } = req.body || {};
    email = norm(email);
    if (!email || !newPassword)
      return res.status(400).json({ error: "email y newPassword requeridos" });

    const hash = await bcrypt.hash(newPassword, 10);
    const up = await pool.query(
      `UPDATE app_user SET password_hash = $2 WHERE LOWER(email) = $1
       RETURNING id, email, LENGTH(password_hash) AS hash_len`,
      [email, hash]
    );
    if (up.rowCount === 0)
      return res.status(404).json({ error: "User not found" });
    res.json({ ok: true, user: up.rows[0] });
  } catch (e) {
    console.error("POST /auth/dev-set-password", e);
    res.status(500).json({ error: "DB error" });
  }
});

router.post("/dev-reset-admin", async (_req, res) => {
  if (IS_PROD)
    return res.status(403).json({ error: "Forbidden in production" });
  try {
    const email = "admin@coffee.com";
    const name = "Admin";
    const role = "admin";
    const hash = await bcrypt.hash("admin123", 10);

    const upsert = await pool.query(
      `INSERT INTO app_user (name, email, password_hash, role, points)
       VALUES ($1, LOWER($2), $3, $4, 0)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role,
             name = EXCLUDED.name
       RETURNING id, name, email, role, points`,
      [name, email, hash, role]
    );
    res.json({ ok: true, admin: upsert.rows[0] });
  } catch (e) {
    console.error("dev-reset-admin error", e);
    res.status(500).json({ error: "DB error" });
  }
});

module.exports = router;
