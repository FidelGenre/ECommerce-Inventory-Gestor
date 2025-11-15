// server/routes/user.js (DB ONLY)
const express = require("express");
const { authRequired } = require("../middlewares/auth");
const pool = require("../db");

const router = express.Router();

/**
 * GET /api/user/profile
 * Devuelve el usuario logueado desde la DB (app_user).
 * Respuesta: { user: { id, name, email, role, points, created_at } }
 */
router.get("/profile", authRequired, async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: "No DB connection" });

    const q = await pool.query(
      `SELECT id, name, email, role, points, created_at
         FROM app_user
        WHERE id = $1`,
      [req.user.id]
    );
    if (q.rowCount === 0)
      return res.status(404).json({ error: "User not found" });
    return res.json({ user: q.rows[0] });
  } catch (e) {
    console.error("GET /user/profile error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/user/points/add
 * Body: { amount: number }  -> suma puntos al usuario actual (mínimo 0)
 * Respuesta: { user: {...} } (refrescado desde DB)
 */
router.post("/points/add", authRequired, async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: "No DB connection" });

    const amount = Math.max(0, Number(req.body?.amount ?? 0));
    await pool.query(
      `UPDATE app_user
          SET points = GREATEST(points + $2, 0)
        WHERE id = $1`,
      [req.user.id, amount]
    );

    const q = await pool.query(
      `SELECT id, name, email, role, points, created_at
         FROM app_user
        WHERE id = $1`,
      [req.user.id]
    );
    if (q.rowCount === 0)
      return res.status(404).json({ error: "User not found" });
    return res.json({ user: q.rows[0] });
  } catch (e) {
    console.error("POST /user/points/add error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * (Opcional) PATCH /api/user/profile
 * Body: { name?: string } -> permite que el usuario actualice su nombre.
 */
router.patch("/profile", authRequired, async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: "No DB connection" });

    const name =
      typeof req.body?.name === "string" ? req.body.name.trim() : null;
    if (!name) return res.status(400).json({ error: "name requerido" });

    await pool.query(`UPDATE app_user SET name = $2 WHERE id = $1`, [
      req.user.id,
      name,
    ]);

    const q = await pool.query(
      `SELECT id, name, email, role, points, created_at
         FROM app_user
        WHERE id = $1`,
      [req.user.id]
    );
    if (q.rowCount === 0)
      return res.status(404).json({ error: "User not found" });
    return res.json({ user: q.rows[0] });
  } catch (e) {
    console.error("PATCH /user/profile error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
