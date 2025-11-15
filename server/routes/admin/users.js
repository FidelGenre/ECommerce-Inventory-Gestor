const express = require("express");
const pool = require("../../db");

const router = express.Router();

/* =====================================================
   CONSTANTE: ADMIN PRINCIPAL
===================================================== */
const MAIN_ADMIN_EMAIL = (
  process.env.MAIN_ADMIN_EMAIL || "admin@coffee.com"
).toLowerCase();

/* =====================================================
   GET /admin/users
===================================================== */

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, email, role, points, created_at
        FROM app_user
    ORDER BY id ASC;
    `);

    res.json(rows);
  } catch (err) {
    console.error("GET /admin/users error:", err);
    res.status(500).json({ error: "DB error" });
  }
});

/* =====================================================
   PUT /admin/users/:id
===================================================== */

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { role, points, name } = req.body || {};

  if (role && !["admin", "client"].includes(role)) {
    return res.status(400).json({ error: "role inválido" });
  }

  try {
    const q = await pool.query(
      `SELECT id, name, email, role, points, created_at
         FROM app_user
        WHERE id = $1`,
      [id]
    );

    if (q.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const current = q.rows[0];
    const emailLower = String(current.email || "").toLowerCase();
    const newRole = role || current.role;

    /* =============================================
       NO PERMITIR CAMBIAR ROL DEL ADMIN PRINCIPAL
    ============================================== */
    if (emailLower === MAIN_ADMIN_EMAIL && newRole !== "admin") {
      return res.status(403).json({
        error: "No se puede cambiar el rol del administrador principal",
      });
    }

    /* =============================================
       UN ADMIN NO PUEDE SACARSE SU PROPIO ROL
    ============================================== */
    if (
      req.user &&
      req.user.id === current.id &&
      current.role === "admin" &&
      newRole !== "admin"
    ) {
      return res
        .status(403)
        .json({ error: "No puedes quitarte tu propio rol de administrador" });
    }

    /* =============================================
       NO PERMITIR ELIMINAR AL ÚLTIMO ADMIN
    ============================================== */
    if (current.role === "admin" && newRole !== "admin") {
      const countAdmins = await pool.query(
        `SELECT COUNT(*) AS c
           FROM app_user
          WHERE role = 'admin'
            AND id <> $1`,
        [current.id]
      );

      const others = Number(countAdmins.rows[0].c || 0);
      if (others === 0) {
        return res.status(403).json({
          error:
            "No se puede cambiar el rol del último administrador del sistema",
        });
      }
    }

    /* =============================================
       ACTUALIZAR USUARIO
    ============================================== */

    const { rows, rowCount } = await pool.query(
      `
      UPDATE app_user
         SET role   = COALESCE($2, role),
             points = COALESCE($3, points),
             name   = COALESCE($4, name)
       WHERE id = $1
   RETURNING id, name, email, role, points, created_at;
      `,
      [id, role || null, points != null ? Number(points) : null, name || null]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /admin/users/:id error:", err);
    res.status(500).json({ error: "DB error" });
  }
});

/* =====================================================
   DELETE /admin/users/:id
===================================================== */

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  try {
    const q = await pool.query(
      `SELECT id, email, role FROM app_user WHERE id = $1`,
      [id]
    );

    if (q.rowCount === 0)
      return res.status(404).json({ error: "User not found" });

    const u = q.rows[0];
    const emailLower = String(u.email || "").toLowerCase();

    /* =============================================
       NO BORRAR ADMIN PRINCIPAL
    ============================================== */
    if (emailLower === MAIN_ADMIN_EMAIL) {
      return res.status(403).json({
        error: "No se puede eliminar al administrador principal del sistema",
      });
    }

    /* =============================================
       UN ADMIN NO PUEDE BORRARSE A SÍ MISMO
    ============================================== */
    if (req.user && req.user.id === u.id) {
      return res
        .status(403)
        .json({ error: "No puedes eliminar tu propio usuario" });
    }

    /* =============================================
       NO BORRAR ÚLTIMO ADMIN
    ============================================== */
    if (u.role === "admin") {
      const countAdmins = await pool.query(
        `SELECT COUNT(*) AS c
           FROM app_user
          WHERE role = 'admin'
            AND id <> $1`,
        [u.id]
      );

      const others = Number(countAdmins.rows[0].c || 0);
      if (others === 0) {
        return res.status(403).json({
          error: "No se puede eliminar al último administrador del sistema",
        });
      }
    }

    /* =============================================
       BORRAR USUARIO
    ============================================== */
    const del = await pool.query(`DELETE FROM app_user WHERE id = $1`, [id]);

    if (del.rowCount === 0)
      return res.status(404).json({ error: "User not found" });

    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /admin/users/:id error:", err);
    res.status(500).json({ error: "DB error" });
  }
});

module.exports = router;
