const express = require("express");
const pool = require("../../db");

const router = express.Router();

/* Helpers internos */
const DEFAULT_IMAGE = "coffeeall.png";
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

function fileNameFromImg(img) {
  if (!img) return DEFAULT_IMAGE;
  const s = String(img).trim();
  if (!s) return DEFAULT_IMAGE;
  return s.split("/").pop() || DEFAULT_IMAGE;
}

function withImageURL(row) {
  if (!row) return row;
  const fname = fileNameFromImg(row.image);
  return { ...row, image: `${BASE_URL}/images/${fname}` };
}

function toNum(v) {
  return v === undefined || v === null || v === "" || isNaN(Number(v))
    ? undefined
    : Number(v);
}

/* ============================
   GET /api/admin/beans
============================ */
router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        b.id,
        b.name,
        b.description,
        b.origin,
        b.roast_level,
        b.price_cents,
        b.image,
        COALESCE(i.stock,0) AS stock,
        COALESCE(i.min_stock,0) AS min_stock,
        m.supplier_id,
        s.name AS supplier_name
      FROM beanstype b
      LEFT JOIN inventory i          ON i.beanstype_id = b.id
      LEFT JOIN beanstype_supplier m ON m.beanstype_id = b.id
      LEFT JOIN suppliers s          ON s.id = m.supplier_id
      ORDER BY b.id ASC;
    `);

    res.json(rows.map(withImageURL));
  } catch (err) {
    console.error("GET /admin/beans", err);
    res.status(500).json({ error: "DB error" });
  }
});

/* ============================
   POST /api/admin/beans
============================ */
router.post("/", async (req, res) => {
  const { name, description, origin, roast_level, price_cents, image } =
    req.body || {};

  if (!name || price_cents == null) {
    return res.status(400).json({ error: "name y price_cents son requeridos" });
  }

  const imgFile = fileNameFromImg(image);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const inserted = await client.query(
      `
      INSERT INTO beanstype (name, description, origin, roast_level, price_cents, image)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *;
      `,
      [name, description, origin, roast_level, Number(price_cents), imgFile]
    );

    const bean = inserted.rows[0];

    await client.query(
      `
      INSERT INTO inventory (beanstype_id, stock, min_stock)
      VALUES ($1,0,0)
      ON CONFLICT (beanstype_id) DO NOTHING
      `,
      [bean.id]
    );

    await client.query("COMMIT");

    res.status(201).json(withImageURL({ ...bean, stock: 0, min_stock: 0 }));
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("POST /admin/beans", e);
    res.status(500).json({ error: "DB error" });
  } finally {
    client.release();
  }
});

/* ============================
   PUT /api/admin/beans/:id
============================ */
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const {
    name,
    description,
    origin,
    roast_level,
    price_cents,
    image,
    supplier_id,
  } = req.body || {};

  const imgFile = fileNameFromImg(image);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const price = toNum(price_cents);

    const upd = await client.query(
      `
      UPDATE beanstype
         SET name        = COALESCE($2, name),
             description = COALESCE($3, description),
             origin      = COALESCE($4, origin),
             roast_level = COALESCE($5, roast_level),
             price_cents = COALESCE($6, price_cents),
             image       = COALESCE($7, image)
       WHERE id=$1
       RETURNING *;
    `,
      [id, name, description, origin, roast_level, price, imgFile]
    );

    if (upd.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Bean not found" });
    }

    /* ============================
        Guardar proveedor
    ============================ */
    if (Object.prototype.hasOwnProperty.call(req.body, "supplier_id")) {
      const sid =
        supplier_id === "" || supplier_id === null || supplier_id === undefined
          ? null
          : Number(supplier_id);

      await client.query(
        `
        INSERT INTO beanstype_supplier (beanstype_id, supplier_id)
        VALUES ($1,$2)
        ON CONFLICT (beanstype_id)
        DO UPDATE SET supplier_id = EXCLUDED.supplier_id;
      `,
        [id, sid]
      );
    }

    /* ============================
        SELECT 
    ============================ */
    const q2 = await client.query(
      `
      SELECT
        b.id, b.name, b.description, b.origin, b.roast_level,
        b.price_cents, b.image,
        COALESCE(i.stock,0) AS stock,
        COALESCE(i.min_stock,0) AS min_stock,
        m.supplier_id,
        s.name AS supplier_name
      FROM beanstype b
      LEFT JOIN inventory i          ON i.beanstype_id = b.id
      LEFT JOIN beanstype_supplier m ON m.beanstype_id = b.id
      LEFT JOIN suppliers s          ON s.id = m.supplier_id
      WHERE b.id=$1
      `,
      [id]
    );

    await client.query("COMMIT");

    res.json(withImageURL(q2.rows[0]));
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PUT /admin/beans/:id", err);
    res.status(500).json({ error: "DB error" });
  } finally {
    client.release();
  }
});

/* ============================
   DELETE /api/admin/beans/:id
============================ */
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`DELETE FROM beanstype_supplier WHERE beanstype_id=$1`, [
      id,
    ]);
    await client.query(`DELETE FROM inventory WHERE beanstype_id=$1`, [id]);

    const del = await client.query(
      `DELETE FROM beanstype WHERE id=$1 RETURNING id`,
      [id]
    );

    if (del.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Not found" });
    }

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("DELETE /admin/beans/:id", e);
    res.status(500).json({ error: "DB error" });
  } finally {
    client.release();
  }
});

module.exports = router;
