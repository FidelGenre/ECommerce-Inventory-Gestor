const express = require("express");
const pool = require("../../db");

const router = express.Router();

/* helpers internos */
function toNum(v) {
  return v === undefined || v === null || v === "" || isNaN(Number(v))
    ? undefined
    : Number(v);
}

/* ============================
   PATCH /api/admin/inventory/:id
============================ */
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const mode = req.body?.mode === "inc" ? "inc" : "set";

  const stock = toNum(req.body?.stock);
  const min_stock = toNum(req.body?.min_stock);

  try {
    await pool.query(
      `
      INSERT INTO inventory (beanstype_id, stock, min_stock)
      VALUES ($1,0,0)
      ON CONFLICT (beanstype_id) DO NOTHING;
      `,
      [id]
    );

    if (mode === "inc") {
      if (stock != null) {
        await pool.query(
          `UPDATE inventory SET stock = GREATEST(stock + $2,0) WHERE beanstype_id=$1`,
          [id, stock]
        );
      }
      if (min_stock != null) {
        await pool.query(
          `UPDATE inventory SET min_stock = GREATEST(min_stock + $2,0) WHERE beanstype_id=$1`,
          [id, min_stock]
        );
      }
    } else {
      if (stock != null) {
        await pool.query(
          `UPDATE inventory SET stock = GREATEST($2,0) WHERE beanstype_id=$1`,
          [id, stock]
        );
      }
      if (min_stock != null) {
        await pool.query(
          `UPDATE inventory SET min_stock = GREATEST($2,0) WHERE beanstype_id=$1`,
          [id, min_stock]
        );
      }
    }

    const { rows } = await pool.query(
      `
      SELECT b.id, b.name, b.price_cents, b.image,
             i.stock, i.min_stock
      FROM beanstype b
      LEFT JOIN inventory i ON i.beanstype_id=b.id
      WHERE b.id=$1;
    `,
      [id]
    );

    res.json(rows[0]);
  } catch (e) {
    console.error("PATCH /admin/inventory/:id", e);
    res.status(500).json({ error: "DB error" });
  }
});

module.exports = router;
