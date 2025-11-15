const express = require("express");
const pool = require("../../db");

const router = express.Router();

/* ======================================================
      HELPERS LOCALES 
====================================================== */

function toNum(v) {
  return v === undefined || v === null || v === "" || isNaN(Number(v))
    ? undefined
    : Number(v);
}

async function tableHas(tableName) {
  const r = await pool.query(
    `SELECT 1
       FROM information_schema.tables
      WHERE table_schema='public' AND table_name=$1
      LIMIT 1`,
    [tableName]
  );
  return r.rowCount > 0;
}

async function listColumns(tableName) {
  const r = await pool.query(
    `SELECT lower(column_name) AS c
       FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1`,
    [tableName]
  );
  return r.rows.map((x) => x.c);
}

async function getCajaSaldo() {
  const { rows } = await pool.query(`
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN type = 'ingreso' THEN amount
          WHEN type = 'egreso'  THEN -amount
          ELSE 0
        END
      ), 0) AS saldo
    FROM cashbox_movements;
  `);

  return Number(rows[0].saldo || 0);
}

/* ======================================================
      GET /admin/dashboard
====================================================== */

router.get("/", async (req, res) => {
  try {
    /* ============================
         PARAMS MES / DÍA
    ============================ */
    const monthParam = (req.query.month || "").trim();
    const dayParam = (req.query.day || "").trim();

    const validMonth = /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : null;
    const validDay = /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : null;

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    const selectedDay = validDay || null;
    const selectedMonth = selectedDay
      ? selectedDay.slice(0, 7)
      : validMonth || currentMonthStr;

    const isDay = !!selectedDay;
    const fmt = isDay ? "YYYY-MM-DD" : "YYYY-MM";
    const filterVal = isDay ? selectedDay : selectedMonth;

    /* ============================
         Columnas dinámicas
    ============================ */
    const orderCols = await listColumns("orders");

    const dateCol = [
      "created_at",
      "created",
      "date",
      "createdon",
      "fecha",
    ].find((c) => orderCols.includes(c));

    if (!dateCol) {
      return res.status(400).json({
        error:
          "No se encontró columna fecha en orders (created_at/created/date/...)",
      });
    }

    const sumCol = ["total_cents", "total", "total_price", "amount_total"].find(
      (c) => orderCols.includes(c)
    );

    const sumIsCents = !!sumCol && sumCol.includes("cents");

    const hasOrderItems = await tableHas("order_items");

    let itemsExpr = "NULL";

    if (hasOrderItems) {
      const itemCols = await listColumns("order_items");

      const hasQty = itemCols.includes("quantity");
      const hasSubtotalCents = itemCols.includes("subtotal_cents");
      const hasUnitPriceCents = itemCols.includes("unit_price_cents");
      const hasUnitPrice = itemCols.includes("unit_price");

      const beanIdCol =
        [
          "beanstype_id",
          "beanstypeid",
          "beans_id",
          "bean_id",
          "product_id",
          "coffee_id",
        ].find((c) => itemCols.includes(c)) || null;

      let candidateProductCol =
        ["product_name", "product", "name", "description", "bean_name"].find(
          (c) => itemCols.includes(c)
        ) ||
        itemCols.find(
          (c) =>
            !c.endsWith("_id") &&
            ![
              "id",
              "order_id",
              "quantity",
              "subtotal_cents",
              "unit_price_cents",
              "unit_price",
              "created_at",
              "updated_at",
            ].includes(c)
        );

      const qtyExpr = hasQty ? "oi.quantity" : "NULL";

      const unitExpr = hasUnitPriceCents
        ? "oi.unit_price_cents/100.0"
        : hasUnitPrice
        ? "oi.unit_price"
        : hasSubtotalCents && hasQty
        ? "oi.subtotal_cents / (100.0 * NULLIF(oi.quantity,0))"
        : "NULL";

      const subtotalExpr = hasSubtotalCents
        ? "oi.subtotal_cents/100.0"
        : hasQty
        ? `${unitExpr} * ${qtyExpr}`
        : "NULL";

      let productExpr = `'Producto'`;
      let joinBean = "";

      if (beanIdCol) {
        joinBean = `LEFT JOIN beanstype b ON b.id = oi.${beanIdCol}`;
        if (candidateProductCol) {
          productExpr = `COALESCE(b.name, oi.${candidateProductCol}::text, 'Producto')`;
        } else {
          productExpr = `COALESCE(b.name, 'Producto')`;
        }
      } else if (candidateProductCol) {
        joinBean = `LEFT JOIN beanstype b ON b.id::text = oi.${candidateProductCol}::text`;
        productExpr = `COALESCE(b.name, oi.${candidateProductCol}::text, 'Producto')`;
      }

      itemsExpr = `
        (
          SELECT json_agg(
                   json_build_object(
                     'product', ${productExpr},
                     'quantity', ${qtyExpr},
                     'unit_price', ${unitExpr},
                     'subtotal', ${subtotalExpr}
                   )
                   ORDER BY oi.id
                 )
            FROM order_items oi
            ${joinBean}
           WHERE oi.order_id = o.id
        )
      `;
    }

    /* =======================
         VENTAS POR MES
    ======================= */

    let ventas = [];

    if (sumCol) {
      const q = await pool.query(`
        SELECT to_char(date_trunc('month', ${dateCol}), 'YYYY-MM') AS ym,
               SUM(${sumCol}) AS s
          FROM orders
         WHERE status IN ('approved','pending_payment')
         GROUP BY ym
         ORDER BY ym ASC;
      `);

      ventas = q.rows.map((r) => ({
        ym: r.ym,
        ventas: Number(r.s || 0) / (sumIsCents ? 100 : 1),
      }));
    } else if (hasOrderItems) {
      const q = await pool.query(`
        SELECT to_char(date_trunc('month', o.${dateCol}), 'YYYY-MM') AS ym,
               SUM(oi.subtotal_cents) AS s
          FROM orders o
          JOIN order_items oi ON oi.order_id = o.id
         WHERE o.status IN ('approved','pending_payment')
         GROUP BY ym
         ORDER BY ym ASC;
      `);

      ventas = q.rows.map((r) => ({
        ym: r.ym,
        ventas: Number(r.s || 0) / 100,
      }));
    }

    /* =======================
         COMPRAS POR MES
    ======================= */

    let compras = [];

    if (await tableHas("purchases")) {
      const purchCols = await listColumns("purchases");
      const hasUnitCostCents = purchCols.includes("unit_cost_cents");
      const hasUnitCost = purchCols.includes("unit_cost");
      const hasTotalCents = purchCols.includes("total_cents");

      const datePurch =
        ["created_at", "created", "date", "fecha", "createdon"].find((c) =>
          purchCols.includes(c)
        ) || "created_at";

      if (hasUnitCostCents) {
        const q = await pool.query(`
          SELECT to_char(date_trunc('month', ${datePurch}), 'YYYY-MM') AS ym,
                 SUM(quantity * unit_cost_cents) AS s
            FROM purchases
           GROUP BY ym
           ORDER BY ym ASC;
        `);

        compras = q.rows.map((r) => ({
          ym: r.ym,
          compras: Number(r.s || 0) / 100,
        }));
      } else if (hasUnitCost) {
        const q = await pool.query(`
          SELECT to_char(date_trunc('month', ${datePurch}), 'YYYY-MM') AS ym,
                 SUM(quantity * unit_cost) AS s
            FROM purchases
           GROUP BY ym
           ORDER BY ym ASC;
        `);

        compras = q.rows.map((r) => ({
          ym: r.ym,
          compras: Number(r.s || 0),
        }));
      } else if (hasTotalCents) {
        const q = await pool.query(`
          SELECT to_char(date_trunc('month', ${datePurch}), 'YYYY-MM') AS ym,
                 SUM(total_cents) AS s
            FROM purchases
           GROUP BY ym
           ORDER BY ym ASC;
        `);

        compras = q.rows.map((r) => ({
          ym: r.ym,
          compras: Number(r.s || 0) / 100,
        }));
      }
    }

    /* =======================
       SERIES unificadas
    ======================= */

    const months = Array.from(
      new Set([...ventas.map((v) => v.ym), ...compras.map((c) => c.ym)])
    ).sort((a, b) => a.localeCompare(b));

    const map = new Map();
    for (const v of ventas)
      map.set(v.ym, { ym: v.ym, ventas: v.ventas, compras: 0 });
    for (const c of compras) {
      const prev = map.get(c.ym) || { ym: c.ym, ventas: 0, compras: 0 };
      prev.compras = c.compras;
      map.set(c.ym, prev);
    }

    const series = Array.from(map.values()).sort((a, b) =>
      a.ym.localeCompare(b.ym)
    );

    /* =======================
        KPIs del mes
    ======================= */

    let ventas_mes = 0;

    if (sumCol) {
      const r = await pool.query(
        `
        SELECT COALESCE(SUM(${sumCol}),0) AS s
          FROM orders
         WHERE status IN ('approved','pending_payment')
           AND to_char(${dateCol}, '${fmt}') = $1;
      `,
        [filterVal]
      );

      ventas_mes = Number(r.rows[0]?.s || 0) / (sumIsCents ? 100 : 1);
    } else if (hasOrderItems) {
      const r = await pool.query(
        `
        SELECT COALESCE(SUM(oi.subtotal_cents),0) AS s
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status IN ('approved','pending_payment')
          AND to_char(o.${dateCol}, '${fmt}') = $1
      `,
        [filterVal]
      );

      ventas_mes = Number(r.rows[0]?.s || 0) / 100;
    }

    let compras_mes = 0;

    if (await tableHas("purchases")) {
      const purchCols = await listColumns("purchases");

      const hasUnitCostCents = purchCols.includes("unit_cost_cents");
      const hasUnitCost = purchCols.includes("unit_cost");
      const hasTotalCents = purchCols.includes("total_cents");

      const datePurch =
        ["created_at", "created", "date", "fecha", "createdon"].find((c) =>
          purchCols.includes(c)
        ) || "created_at";

      if (hasUnitCostCents) {
        const r2 = await pool.query(
          `
          SELECT COALESCE(SUM(quantity * unit_cost_cents),0) AS s
            FROM purchases
           WHERE to_char(${datePurch}, '${fmt}') = $1;
        `,
          [filterVal]
        );

        compras_mes = Number(r2.rows[0]?.s || 0) / 100;
      } else if (hasUnitCost) {
        const r2 = await pool.query(
          `
          SELECT COALESCE(SUM(quantity * unit_cost),0) AS s
            FROM purchases
           WHERE to_char(${datePurch}, '${fmt}') = $1;
        `,
          [filterVal]
        );

        compras_mes = Number(r2.rows[0]?.s || 0);
      } else if (hasTotalCents) {
        const r2 = await pool.query(
          `
          SELECT COALESCE(SUM(total_cents),0) AS s
            FROM purchases
           WHERE to_char(${datePurch}, '${fmt}') = $1;
        `,
          [filterVal]
        );

        compras_mes = Number(r2.rows[0]?.s || 0) / 100;
      }
    }

    /* ======================================================
         CANTIDAD DE VENTAS + CANTIDAD DE PRODUCTOS
    ====================================================== */

    let ventas_count = 0;
    let productos_vendidos = 0;

    try {
      const rCount = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM orders
        WHERE status IN ('approved','pending_payment')
          AND to_char(${dateCol}, '${fmt}') = $1;
      `,
        [filterVal]
      );

      ventas_count = Number(rCount.rows[0].total || 0);
    } catch {}

    try {
      const rItems = await pool.query(
        `
        SELECT COALESCE(SUM(oi.quantity),0) AS total
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status IN ('approved','pending_payment')
          AND to_char(o.${dateCol}, '${fmt}') = $1;
      `,
        [filterVal]
      );

      productos_vendidos = Number(rItems.rows[0].total || 0);
    } catch {}

    /* ======================================================
         TOP 3 PRODUCTOS DEL MES
    ====================================================== */

    let top_products = [];

    try {
      const rTop = await pool.query(
        `
        SELECT 
          b.name AS product,
          SUM(oi.quantity) AS total_qty
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        LEFT JOIN beanstype b ON b.id = oi.beanstype_id
        WHERE o.status IN ('approved','pending_payment')
          AND to_char(o.${dateCol}, '${fmt}') = $1
        GROUP BY b.name
        ORDER BY total_qty DESC
        LIMIT 3;
      `,
        [filterVal]
      );

      top_products = rTop.rows;
    } catch {}

    /* ======================================================
         DETALLE ÚLTIMAS 20 VENTAS
    ====================================================== */

    let ventas_detalle = [];

    if (sumCol) {
      const q = await pool.query(
        `
        SELECT o.${dateCol} AS created_at,
               o.order_number,
               COALESCE(NULLIF(TRIM(o.customer_name), ''), u.name, o.customer_email) AS customer_name,
               u.name AS user_name,
               ${itemsExpr} AS items,
               ${sumIsCents ? `o.${sumCol}/100.0` : `o.${sumCol}`} AS total
        FROM orders o
        LEFT JOIN app_user u ON u.id = o.user_id
        WHERE o.status IN ('approved','pending_payment')
          AND to_char(o.${dateCol}, '${fmt}') = $1
        ORDER BY o.${dateCol} DESC
        LIMIT 20;
      `,
        [filterVal]
      );

      ventas_detalle = q.rows;
    } else if (hasOrderItems) {
      const q = await pool.query(
        `
        SELECT o.${dateCol} AS created_at,
               o.order_number,
               COALESCE(NULLIF(TRIM(o.customer_name), ''), u.name, o.customer_email) AS customer_name,
               u.name AS user_name,
               ${itemsExpr} AS items,
               SUM(oi.subtotal_cents)/100.0 AS total
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        LEFT JOIN app_user u ON u.id = o.user_id
        WHERE o.status IN ('approved','pending_payment')
          AND to_char(o.${dateCol}, '${fmt}') = $1
        GROUP BY o.id, u.name, o.${dateCol}
        ORDER BY o.${dateCol} DESC
        LIMIT 20;
      `,
        [filterVal]
      );

      ventas_detalle = q.rows;
    }

    /* ======================================================
         DETALLE ÚLTIMAS 20 COMPRAS
    ====================================================== */

    let compras_detalle = [];

    if (await tableHas("purchases")) {
      const purchCols = await listColumns("purchases");

      const hasUnitCostCents = purchCols.includes("unit_cost_cents");
      const hasUnitCost = purchCols.includes("unit_cost");

      const datePurch =
        ["created_at", "created", "date", "fecha", "createdon"].find((c) =>
          purchCols.includes(c)
        ) || "created_at";

      const unitExpr = hasUnitCostCents
        ? "p.unit_cost_cents/100.0"
        : hasUnitCost
        ? "p.unit_cost"
        : "NULL";

      const totalExpr = hasUnitCostCents
        ? "(p.quantity * p.unit_cost_cents)/100.0"
        : hasUnitCost
        ? "(p.quantity * p.unit_cost)"
        : "NULL";

      const hasCreatedByUserId = purchCols.includes("created_by_user_id");
      const userJoin = hasCreatedByUserId
        ? "LEFT JOIN app_user u ON u.id = p.created_by_user_id"
        : "";
      const userNameExpr = hasCreatedByUserId ? "u.name" : "NULL";

      const hasBatchCode = purchCols.includes("batch_code");
      const groupKeyExpr = hasBatchCode
        ? "COALESCE(p.batch_code, p.id::text)"
        : "p.id::text";

      const q = await pool.query(
        `
        SELECT ${groupKeyExpr} AS group_id,
               MIN(p.${datePurch}) AS created_at,
               s.name AS supplier,
               ${userNameExpr} AS user_name,
               COALESCE(SUM(${totalExpr}),0) AS total,
               json_agg(
                 json_build_object(
                   'product', COALESCE(b.name, 'Producto'),
                   'quantity', p.quantity,
                   'unit_price', ${unitExpr},
                   'subtotal', ${totalExpr}
                 )
                 ORDER BY p.id
               ) AS items
        FROM purchases p
        LEFT JOIN suppliers s ON s.id = p.supplier_id
        LEFT JOIN beanstype b ON b.id = p.beanstype_id
        ${userJoin}
        WHERE to_char(p.${datePurch}, '${fmt}') = $1
        GROUP BY group_id, s.name, ${userNameExpr}
        ORDER BY created_at DESC
        LIMIT 20;
      `,
        [filterVal]
      );

      compras_detalle = q.rows;
    }

    /* ======================================================
       RESPUESTA COMPLETA
    ====================================================== */

    res.json({
      resumen: {
        ventas_mes,
        compras_mes,
        ganancia_mes: ventas_mes - compras_mes,
        caja_dinero_local: await getCajaSaldo(),

        ventas_count,
        productos_vendidos,
      },

      top_products,

      series,
      ventas,
      compras,

      ventas_detalle,
      compras_detalle,

      months,
      selected_month: selectedMonth,
      selected_day: selectedDay,

      meta: {
        currency: "ARS",
        kpi_period: isDay ? "día" : "mes",
        orders_total_col_usado:
          sumCol || "subtotal_cents (fallback order_items)",
        units_note: "Todos los montos están en ARS (no centavos).",
      },
    });
  } catch (err) {
    console.error("[/api/admin/dashboard]", err);
    res.status(500).json({ error: "Error generando dashboard" });
  }
});

module.exports = router;
