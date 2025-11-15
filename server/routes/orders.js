// server/routes/orders.js
const express = require("express");
const crypto = require("crypto");
const pool = require("../db");
const { authRequired } = require("../middlewares/auth");

const router = express.Router();

/* ============================
   CONFIG
=============================== */
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const CURRENCY_ID = process.env.CURRENCY_ID || "ARS";
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const MP_PUBLIC_BASE_URL = process.env.MP_PUBLIC_BASE_URL || BASE_URL;

/* ============================
   HELPERS
=============================== */
const toCents = (n) => Math.round(Number(n || 0) * 100);
const fromCents = (c) => Math.round(Number(c || 0)) / 100;

function genOrderNumber() {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rnd = String(crypto.randomInt(0, 9999)).padStart(4, "0");
  return `CB-${ymd}-${rnd}`;
}

async function mpFetch(path, init = {}) {
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const txt = await res.text();
  let json;
  try {
    json = txt ? JSON.parse(txt) : undefined;
  } catch {
    json = { raw: txt };
  }
  if (!res.ok) {
    const err = new Error(
      `MP ${init.method || "GET"} ${path} -> ${res.status}`
    );
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function withRetry(fn, { tries = 4, baseMs = 250 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const retry = e.status >= 500 || e.status === 429 || !e.status;
      if (!retry || i === tries - 1) throw e;
      await new Promise((r) =>
        setTimeout(r, baseMs * 2 ** i + Math.random() * 100)
      );
    }
  }
  throw last;
}

/**
 * Descuenta stock en la tabla inventory para los ítems de la orden.
 * Usa el título del ítem para buscar el beanstype (name).
 * Se asume que el título coincide con beanstype.name.
 */
async function descontarStockPorOrden(client, safeItems) {
  for (const it of safeItems) {
    // Buscamos el producto en beanstype por nombre (case-insensitive)
    const { rows: beanRows } = await client.query(
      `
      SELECT id
        FROM beanstype
       WHERE lower(name) = lower($1)
       LIMIT 1;
      `,
      [it.title]
    );

    if (!beanRows.length) {
      // Si no lo encontramos, simplemente seguimos con el siguiente ítem
      console.warn(
        "[descontarStockPorOrden] No se encontró beanstype para título:",
        it.title
      );
      continue;
    }

    const beanId = beanRows[0].id;
    const qty = Math.max(1, Number(it.quantity || 1));

    // Aseguramos que exista el registro en inventory
    await client.query(
      `
      INSERT INTO inventory (beanstype_id, stock, min_stock)
      VALUES ($1, 0, 0)
      ON CONFLICT (beanstype_id) DO NOTHING;
      `,
      [beanId]
    );

    // Descontamos stock (sin permitir valores negativos)
    await client.query(
      `
      UPDATE inventory
         SET stock = GREATEST(stock - $2, 0)
       WHERE beanstype_id = $1;
      `,
      [beanId, qty]
    );
  }
}

/* ============================
   POST /api/orders/checkout
=============================== */
router.post("/checkout", authRequired, async (req, res) => {
  if (!MP_ACCESS_TOKEN)
    return res.status(500).json({ error: "Falta MP_ACCESS_TOKEN" });

  const { customer = {}, shipping = {}, items = [] } = req.body || {};

  const safeItems = (Array.isArray(items) ? items : [])
    .map((it) => ({
      title: String(it.title || "Producto"),
      quantity: Math.max(1, Number(it.quantity || 1)),
      unit_price:
        typeof it.unit_price === "number"
          ? it.unit_price
          : parseFloat(String(it.unit_price).replace(/[^0-9.-]+/g, "") || "0"),
    }))
    .filter((it) => it.title && it.quantity > 0 && it.unit_price >= 0.01);

  if (!safeItems.length)
    return res.status(400).json({ error: "No hay ítems válidos" });

  const user_id = req.user?.id ?? null;
  const customer_name = customer.name || req.user?.name || "Invitado";
  const customer_email = customer.email || req.user?.email || "";
  const shipping_address = shipping.address1 || "";

  if (!customer_email)
    return res.status(400).json({ error: "Falta email del cliente" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const order_number = genOrderNumber();
    const total_cents = safeItems.reduce(
      (acc, it) => acc + toCents(it.unit_price) * it.quantity,
      0
    );

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (
         order_number, user_id, total_cents, customer_name, customer_email, shipping_address,
         status, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,'pending_payment', now(), now())
       RETURNING id`,
      [
        order_number,
        user_id,
        total_cents,
        customer_name,
        customer_email,
        shipping_address,
      ]
    );
    const order_id = orderRows[0].id;

    for (const it of safeItems) {
      const unit_c = toCents(it.unit_price);
      const sub_c = unit_c * it.quantity;
      await client.query(
        `INSERT INTO order_items (order_id, title, quantity, unit_price_cents, subtotal_cents)
         VALUES ($1,$2,$3,$4,$5)`,
        [order_id, it.title, it.quantity, unit_c, sub_c]
      );
    }

    // 🔽🔽🔽 NUEVO: descontar stock en inventory dentro de la misma transacción
    await descontarStockPorOrden(client, safeItems);
    // 🔼🔼🔼

    const prefPayload = {
      items: safeItems.map((it) => ({
        title: it.title,
        quantity: it.quantity,
        unit_price: it.unit_price,
        currency_id: CURRENCY_ID,
      })),
      binary_mode: true,
      notification_url: `${MP_PUBLIC_BASE_URL}/api/pay/mp/webhook`,
      external_reference: order_number,
      statement_descriptor: "COFFEE-BEANS",
      payer: { name: customer_name, email: customer_email },
    };

    const preference = await withRetry(
      () =>
        mpFetch("/checkout/preferences", {
          method: "POST",
          headers: { "X-Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify(prefPayload),
        }),
      { tries: 4, baseMs: 300 }
    );

    await client.query("COMMIT");
    res.json({
      order_number,
      order_id,
      preference_id: preference?.id,
      total: fromCents(total_cents),
    });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("[/orders/checkout] error:", e);
    res.status(500).json({ error: e.message || "Error en checkout" });
  } finally {
    client.release();
  }
});

/* ============================
   GET /api/orders/my
=============================== */
router.get("/my", authRequired, async (req, res) => {
  try {
    const uid = Number(req.user?.id);
    if (!uid) return res.json([]);
    const { rows } = await pool.query(
      `SELECT id, order_number, status, total_cents, created_at
         FROM orders
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [uid]
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        order_number: r.order_number,
        status: r.status,
        total: fromCents(r.total_cents),
        created_at: r.created_at,
      }))
    );
  } catch (e) {
    console.error("[/orders/my]", e);
    res.status(500).json({ error: "Error listando órdenes" });
  }
});

/* ============================
   GET /api/orders/id/:orderId  (detalle por ID numérico)
=============================== */
router.get("/id/:orderId", authRequired, async (req, res) => {
  const orderId = Number.parseInt(req.params.orderId, 10);
  if (!Number.isFinite(orderId))
    return res.status(400).json({ error: "orderId inválido" });

  try {
    const { rows: head } = await pool.query(
      `SELECT id, user_id, order_number, status, total_cents, created_at
         FROM orders
        WHERE id = $1`,
      [orderId]
    );
    const uid = Number(req.user?.id);
    if (!head.length || Number(head[0].user_id) !== uid)
      return res.status(404).json({ error: "Orden no encontrada" });

    const { rows: items } = await pool.query(
      `SELECT id, title, quantity, unit_price_cents, subtotal_cents
         FROM order_items
        WHERE order_id = $1
        ORDER BY id`,
      [orderId]
    );

    res.json({
      id: head[0].id,
      order_number: head[0].order_number,
      status: head[0].status,
      total: fromCents(head[0].total_cents),
      created_at: head[0].created_at,
      items: items.map((it) => ({
        id: it.id,
        title: it.title,
        quantity: it.quantity,
        unit_price: fromCents(it.unit_price_cents),
        subtotal: fromCents(it.subtotal_cents),
      })),
    });
  } catch (e) {
    console.error("[/orders/id/:orderId]", e);
    res.status(500).json({ error: "Error leyendo orden" });
  }
});

/* ============================
   GET /api/orders/by-number/:orderNumber  (detalle por número)
=============================== */
router.get("/by-number/:orderNumber", authRequired, async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const { rows } = await pool.query(
      `
      SELECT o.id, o.order_number, o.user_id, o.status, o.total_cents, o.created_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', oi.id,
                   'title', oi.title,
                   'quantity', oi.quantity,
                   'unit_price', (oi.unit_price_cents / 100.0),
                   'subtotal', (oi.subtotal_cents / 100.0)
                 )
                 ORDER BY oi.id
               ) FILTER (WHERE oi.id IS NOT NULL),
               '[]'
             ) AS items
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.order_number = $1
       GROUP BY o.id
      `,
      [orderNumber]
    );

    const uid = Number(req.user?.id);
    if (!rows.length || Number(rows[0].user_id) !== uid)
      return res.status(404).json({ error: "Orden no encontrada" });

    const o = rows[0];
    res.json({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      total: fromCents(o.total_cents),
      created_at: o.created_at,
      items: o.items,
    });
  } catch (err) {
    console.error("[/orders/by-number]", err);
    res.status(500).json({ error: "Error obteniendo orden" });
  }
});

module.exports = router;
