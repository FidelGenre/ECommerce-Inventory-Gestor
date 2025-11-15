const express = require("express");
const pool = require("../../db");

const router = express.Router();

/* =============== Helpers propios =============== */

function groupPurchases(items) {
  const map = {};

  for (const it of items) {
    const key = it.product_name.toLowerCase();

    if (!map[key]) {
      map[key] = {
        product_name: it.product_name,
        quantity: 0,
        subtotal_ars: 0,
        dates: [],
      };
    }

    map[key].quantity += it.quantity;
    map[key].subtotal_ars += it.subtotal_ars;
    map[key].dates.push(it.created_at);
  }

  return Object.values(map).sort((a, b) => {
    const da = Math.max(...a.dates.map((d) => new Date(d).getTime()));
    const db = Math.max(...b.dates.map((d) => new Date(d).getTime()));
    return db - da;
  });
}

/* ===============================================
   GET /admin/suppliers
   → Soporta:
     ?month=2025-03
     ?from=YYYY-MM-DD&to=YYYY-MM-DD
=============================================== */

router.get("/", async (req, res) => {
  try {
    const { month, from, to } = req.query;

    let dateFilter = "";
    const params = [];

    /* ----- FILTRO POR MES COMPLETO ----- */
    if (month) {
      dateFilter = `
        AND DATE_TRUNC('month', p.created_at) =
            DATE_TRUNC('month', $1::date)
      `;
      params.push(month + "-01");
    } else if (from && to) {

    /* ----- FILTRO POR RANGO DE DÍAS ----- */
      dateFilter = `
        AND p.created_at BETWEEN ($1::date)
                            AND ($2::date + INTERVAL '23 hours 59 minutes 59 seconds')
      `;
      params.push(from, to);
    }

    /* ----- OBTENER PROVEEDORES ----- */
    const { rows: suppliers } = await pool.query(`
      SELECT
        s.id,
        s.name,
        s.category,
        sm.alias,
        sm.email,
        sm.address
      FROM suppliers s
      LEFT JOIN suppliers_meta sm ON sm.supplier_id = s.id
      ORDER BY s.name;
    `);

    /* ----- OBTENER COMPRAS FILTRADAS ----- */
    const { rows: history } = await pool.query(
      `
      SELECT
        p.id AS purchase_id,
        p.supplier_id,
        p.created_at,
        p.quantity,
        p.unit_cost_cents,
        (p.quantity * p.unit_cost_cents) AS subtotal_cents,
        b.name AS product_name
      FROM purchases p
      LEFT JOIN beanstype b ON b.id = p.beanstype_id
      WHERE 1=1
      ${dateFilter}
      ORDER BY p.created_at DESC;
      `,
      params
    );

    /* Agrupar compras por proveedor */
    const grouped = {};
    for (const h of history) {
      if (!grouped[h.supplier_id]) grouped[h.supplier_id] = [];

      grouped[h.supplier_id].push({
        id: h.purchase_id,
        product_name: h.product_name || "Producto",
        quantity: h.quantity,
        unit_cost_ars: h.unit_cost_cents / 100,
        subtotal_ars: h.subtotal_cents / 100,
        created_at: h.created_at,
      });
    }

    /* Preparar respuesta final */
    const final = suppliers.map((sp) => {
      const comprasProveedor = grouped[sp.id] || [];
      const groupedItems = groupPurchases(comprasProveedor);

      const totalInvertido = groupedItems.reduce(
        (acc, it) => acc + it.subtotal_ars,
        0
      );

      const totalUnidades = groupedItems.reduce(
        (acc, it) => acc + it.quantity,
        0
      );

      return {
        ...sp,
        total_ars: totalInvertido,
        unidades_pendientes: totalUnidades,
        purchases: groupedItems,
      };
    });

    res.json(final);
  } catch (e) {
    console.error("GET /admin/suppliers ERROR:", e);
    res.status(500).json({ error: "Error cargando proveedores" });
  }
});

/* ===============================================
   POST /admin/suppliers
   Crear proveedor + meta
=============================================== */

router.post("/", async (req, res) => {
  const { name, category, alias, email, address } = req.body || {};

  if (!name || !category) {
    return res.status(400).json({ error: "name y category son requeridos" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* Crear proveedor */
    const inserted = await client.query(
      `
      INSERT INTO suppliers (name, category)
      VALUES ($1, $2)
      RETURNING id, name, category;
      `,
      [name, category]
    );

    const supplier = inserted.rows[0];

    /* Crear supplier_meta */
    await client.query(
      `
      INSERT INTO suppliers_meta (supplier_id, alias, email, address)
      VALUES ($1, $2, $3, $4);
      `,
      [supplier.id, alias || null, email || null, address || null]
    );

    await client.query("COMMIT");

    res.status(201).json({
      ...supplier,
      alias: alias || null,
      email: email || null,
      address: address || null,
      total_ars: 0,
      unidades_pendientes: 0,
      purchases: [],
    });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("POST /admin/suppliers ERROR:", e);
    res.status(500).json({ error: "Error creando proveedor" });
  } finally {
    client.release();
  }
});

module.exports = router;
