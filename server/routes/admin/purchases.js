const express = require("express");
const pool = require("../../db");
const router = express.Router();

/* ============================================================
      HELPERS
============================================================ */

function toNum(v) {
  return v === undefined || v === null || v === "" || isNaN(Number(v))
    ? undefined
    : Number(v);
}

async function listColumns(tableName) {
  const q = await pool.query(
    `
    SELECT lower(column_name) AS c
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name=$1
  `,
    [tableName]
  );
  return q.rows.map((x) => x.c);
}

async function ensureCompat(clientOrPool = pool) {
  await clientOrPool.query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('beans','bags')),
      UNIQUE(name, category)
    );
  `);

  await clientOrPool.query(`
    CREATE TABLE IF NOT EXISTS suppliers_meta (
      supplier_id INT PRIMARY KEY REFERENCES suppliers(id) ON DELETE CASCADE,
      email   TEXT,
      address TEXT,
      alias   TEXT
    );
  `);

  await clientOrPool.query(`
    CREATE TABLE IF NOT EXISTS beanstype_supplier (
      beanstype_id INT PRIMARY KEY REFERENCES beanstype(id) ON DELETE CASCADE,
      supplier_id  INT REFERENCES suppliers(id) ON DELETE SET NULL
    );
  `);

  await clientOrPool.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      beanstype_id INT PRIMARY KEY REFERENCES beanstype(id) ON DELETE CASCADE,
      stock INT NOT NULL DEFAULT 0,
      min_stock INT NOT NULL DEFAULT 0
    );
  `);

  await clientOrPool.query(`
    INSERT INTO suppliers (name, category)
      VALUES ('Proveedor Granos SRL','beans')
    ON CONFLICT (name,category) DO NOTHING;
  `);

  await clientOrPool.query(`
    INSERT INTO suppliers (name, category)
      VALUES ('Proveedor Bolsas SA','bags')
    ON CONFLICT (name,category) DO NOTHING;
  `);
}

async function ensureDefaultSuppliers(clientOrPool = pool) {
  await ensureCompat(clientOrPool);

  const { rows } = await clientOrPool.query(`
    SELECT s.id, s.name, s.category
    FROM suppliers s
    ORDER BY s.name;
  `);

  return rows;
}

/* ============================================================
      COMPRA SIMPLE
============================================================ */

router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureCompat(client);

    let supplier_id = toNum(
      req.body?.supplier_id ?? req.body?.supplierId ?? req.body?.supplier
    );

    const beanstype_id = toNum(
      req.body?.beanstype_id ??
        req.body?.beanstypeId ??
        req.body?.bean_id ??
        req.body?.beanId ??
        req.body?.product_id ??
        req.body?.productId ??
        req.body?.id
    );

    const quantity = toNum(
      req.body?.quantity ??
        req.body?.qty ??
        req.body?.cantidad ??
        req.body?.amount
    );

    const unit_cost_ars = toNum(
      req.body?.unit_cost_ars ??
        req.body?.unit_cost ??
        req.body?.costo ??
        req.body?.cost ??
        req.body?.price ??
        req.body?.precio ??
        req.body?.unitPrice ??
        req.body?.price_ars ??
        req.body?.cost_ars
    );

    // Auto proveedor si no se envió
    if (!supplier_id) {
      const supList = await ensureDefaultSuppliers(client);
      const def =
        supList.find((s) => s.category === "beans") || supList[0] || null;
      if (def) supplier_id = def.id;
    }

    if (!supplier_id || !quantity || unit_cost_ars == null) {
      client.release();
      return res.status(400).json({
        error:
          "supplier_id, quantity y unit_cost_ars son requeridos (beanstype_id si es granos).",
      });
    }

    // Validar proveedor
    const sup = await client.query(
      `SELECT id, name, category FROM suppliers WHERE id=$1`,
      [supplier_id]
    );
    if (sup.rowCount === 0) {
      client.release();
      return res.status(400).json({ error: "Proveedor inexistente" });
    }

    const supplier = sup.rows[0];

    if (supplier.category === "beans" && !beanstype_id) {
      client.release();
      return res
        .status(400)
        .json({ error: "beanstype_id requerido para compras de granos" });
    }

    const unit_cost_cents = Math.round(unit_cost_ars * 100);
    const currentUserId = req.user?.id || null;

    await client.query("BEGIN");

    // Insertar compra
    const insert = await client.query(
      `
      INSERT INTO purchases
        (supplier_id, beanstype_id, quantity, unit_cost_cents, created_by_user_id)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id;
      `,
      [
        supplier_id,
        beanstype_id || null,
        quantity,
        unit_cost_cents,
        currentUserId,
      ]
    );

    const purchaseId = insert.rows[0].id;

    const totalCostCents = quantity * unit_cost_cents;
    const totalCostARS = totalCostCents / 100;

    // Registrar en caja
    await client.query(
      `
      INSERT INTO cashbox_movements(type, concept, amount)
      VALUES ('egreso', $1, $2)
      `,
      [`Compra proveedor #${supplier_id}`, totalCostARS]
    );

    // Marcar como pagada
    await client.query(
      `
      UPDATE purchases
      SET is_paid = true,
          paid_at = NOW(),
          payment_method = 'caja',
          total_cents = $2,
          cost_cents = $2
      WHERE id=$1
      `,
      [purchaseId, totalCostCents]
    );

    // Actualizar inventario (solo granos)
    if (beanstype_id) {
      await client.query(
        `
        INSERT INTO inventory (beanstype_id, stock, min_stock)
        VALUES ($1,$2,0)
        ON CONFLICT (beanstype_id)
        DO UPDATE SET stock = inventory.stock + EXCLUDED.stock;
        `,
        [beanstype_id, quantity]
      );
    }

    await client.query("COMMIT");
    client.release();
    res.status(201).json({ ok: true, id: purchaseId });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    console.error("POST /admin/purchases ERROR:", e);
    res.status(500).json({ error: "DB error" });
  }
});

/* ============================================================
      COMPRA MASIVA 
============================================================ */

router.post("/bulk", async (req, res) => {
  const supplier_id = toNum(req.body?.supplier_id);
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  if (!supplier_id)
    return res.status(400).json({ error: "supplier_id requerido" });

  if (!items.length)
    return res.status(400).json({ error: "No hay ítems para procesar" });

  const client = await pool.connect();

  try {
    await ensureCompat(client);
    await client.query("BEGIN");

    const currentUserId = req.user?.id || null;
    const purchCols = await listColumns("purchases");
    const hasBatch = purchCols.includes("batch_code");

    // Crear batch único por proveedor
    const batchCode = hasBatch ? `BULK-${supplier_id}-${Date.now()}` : null;

    const results = [];

    for (const it of items) {
      const beanstype_id = toNum(it.beanstype_id);
      const quantity = toNum(it.quantity);
      const unit_cost_ars = toNum(it.unit_cost_ars);

      if (!quantity || !unit_cost_ars) continue;

      const cost_cents = Math.round(unit_cost_ars * 100);

      let insert;

      if (hasBatch) {
        insert = await client.query(
          `
          INSERT INTO purchases
            (supplier_id, beanstype_id, quantity, unit_cost_cents, created_by_user_id, batch_code)
          VALUES ($1,$2,$3,$4,$5,$6)
          RETURNING id
        `,
          [
            supplier_id,
            beanstype_id,
            quantity,
            cost_cents,
            currentUserId,
            batchCode,
          ]
        );
      } else {
        insert = await client.query(
          `
          INSERT INTO purchases
            (supplier_id, beanstype_id, quantity, unit_cost_cents, created_by_user_id)
          VALUES ($1,$2,$3,$4,$5)
          RETURNING id
        `,
          [supplier_id, beanstype_id, quantity, cost_cents, currentUserId]
        );
      }

      const purchase_id = insert.rows[0].id;
      const totalARS = quantity * unit_cost_ars;

      // restar caja
      await client.query(
        `INSERT INTO cashbox_movements(type, concept, amount)
         VALUES ('egreso', $1, $2)`,
        [`Compra masiva proveedor #${supplier_id}`, totalARS]
      );

      // marcar pagada
      await client.query(
        `
        UPDATE purchases
        SET is_paid=true,
            paid_at=NOW(),
            payment_method='caja',
            total_cents=$2,
            cost_cents=$2
        WHERE id=$1
      `,
        [purchase_id, quantity * cost_cents]
      );

      // inventario
      if (beanstype_id)
        await client.query(
          `
        INSERT INTO inventory(beanstype_id, stock, min_stock)
        VALUES($1,$2,0)
        ON CONFLICT(beanstype_id)
        DO UPDATE SET stock = inventory.stock + $2
      `,
          [beanstype_id, quantity]
        );

      results.push({
        purchase_id,
        beanstype_id,
        quantity,
        total_ars: totalARS,
      });
    }

    await client.query("COMMIT");
    client.release();

    res.json({
      ok: true,
      supplier_id,
      batch_code: batchCode,
      count: results.length,
      results,
    });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    client.release();

    console.error("POST /admin/purchases/bulk ERROR:", e);
    res.status(500).json({
      error: e.message || "Error en compra masiva",
    });
  }
});

module.exports = router;
