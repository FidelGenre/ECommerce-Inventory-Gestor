// server/routes/pay.js
const express = require("express");
const pool = require("../db");

const router = express.Router();

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_PUBLIC_BASE_URL = process.env.MP_PUBLIC_BASE_URL || "";
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

function log(...args) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[webhook]", ...args);
  }
}

// MercadoPago fetch helper
async function mpApi(path) {
  const r = await fetch(`https://api.mercadopago.com${path}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  });

  const txt = await r.text();
  let json;
  try {
    json = txt ? JSON.parse(txt) : undefined;
  } catch {
    json = { raw: txt };
  }

  if (!r.ok) {
    const e = new Error(`MP GET ${path} -> ${r.status}`);
    e.status = r.status;
    e.body = json;
    throw e;
  }

  return json;
}

// ─────────────────────────────────────
// IDempotencia: Registrar pagos procesados
// ─────────────────────────────────────
async function markProcessed(mp_payment_id, client) {
  try {
    await client.query(
      `INSERT INTO processed_payments (mp_payment_id) VALUES ($1)`,
      [String(mp_payment_id)]
    );
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────
// NUEVO: Registrar ingreso en caja
// ─────────────────────────────────────
async function addIngresoCaja(client, concept, amountARS) {
  await client.query(
    `
    INSERT INTO cashbox_movements (type, concept, amount)
    VALUES ('ingreso', $1, $2);
  `,
    [concept, amountARS]
  );
}

// ─────────────────────────────────────
// PROCESAR PAGO APROBADO
// descuentos stock + puntos + ingreso caja
// ─────────────────────────────────────
async function handleApprovedPayment(mp_payment_id) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // idempotencia
    const firstTime = await markProcessed(mp_payment_id, client);
    if (!firstTime) {
      await client.query("COMMIT");
      log("payment ya procesado:", mp_payment_id);
      return;
    }

    // leer pago en MP
    const p = await mpApi(`/v1/payments/${mp_payment_id}`);
    const orderNumber = p?.external_reference;
    if (!orderNumber) {
      log("payment sin external_reference:", mp_payment_id);
      await client.query("COMMIT");
      return;
    }

    // buscar orden
    const { rows: ordRows } = await client.query(
      `SELECT id, user_id, status FROM orders WHERE order_number = $1 FOR UPDATE`,
      [orderNumber]
    );

    if (!ordRows.length) {
      log("Orden no encontrada:", orderNumber);
      await client.query("COMMIT");
      return;
    }

    const orderId = ordRows[0].id;
    const userId = ordRows[0].user_id;

    // marcar como aprobada
    await client.query(
      `
      UPDATE orders
         SET status = 'approved',
             updated_at = now()
       WHERE id = $1
    `,
      [orderId]
    );

    // obtener items
    const { rows: items } = await client.query(
      `SELECT title, quantity FROM order_items WHERE order_id = $1`,
      [orderId]
    );

    // descontar stock
    for (const it of items) {
      const title = String(it.title || "").trim();
      const qty = Math.max(1, Number(it.quantity || 1));

      await client.query(
        `
        UPDATE inventory
           SET stock = GREATEST(0, COALESCE(stock,0) - $2)
         WHERE beanstype_id = (
           SELECT id FROM beanstype WHERE name = $1 LIMIT 1
         );
      `,
        [title, qty]
      );
    }

    // sumar puntos
    const totalQty = items.reduce(
      (acc, it) => acc + Math.max(1, Number(it.quantity || 1)),
      0
    );

    if (userId && totalQty > 0) {
      await client.query(
        `
        UPDATE app_user
           SET points = COALESCE(points,0) + $2
         WHERE id = $1
      `,
        [userId, totalQty * 10]
      );
    }

    // ─────────────────────────────────────
    // NUEVO: obtener total de la orden y SUMAR A CAJA
    // ─────────────────────────────────────
    const { rows: totalRows } = await client.query(
      `SELECT total_cents FROM orders WHERE id = $1`,
      [orderId]
    );

    const totalCents = Number(totalRows[0]?.total_cents || 0);
    const totalARS = totalCents / 100;

    if (totalARS > 0) {
      await addIngresoCaja(client, `Venta #${orderId}`, totalARS);
      console.log("Caja +", totalARS, "ARS por venta", orderId);
    }

    await client.query("COMMIT");
    log("OK pago aprobado:", {
      orderNumber,
      mp_payment_id,
      total: totalARS,
      items: totalQty,
    });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("[webhook] ERROR en handleApprovedPayment:", e);
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────
// WEBHOOK DE MERCADOPAGO
// ─────────────────────────────────────
router.post("/mp/webhook", async (req, res) => {
  try {
    const { id, topic, type } = req.query;
    const raw = req.body;

    const topicVal = String(topic || type || "").toLowerCase();

    if (!topicVal) {
      return res.sendStatus(200);
    }

    // pago directo
    if (topicVal === "payment") {
      const paymentId = id || raw?.data?.id || raw?.id;

      if (!paymentId) return res.sendStatus(200);

      const p = await mpApi(`/v1/payments/${paymentId}`);
      const status = p?.status;

      if (status === "approved") {
        await handleApprovedPayment(String(paymentId));
      }

      return res.sendStatus(200);
    }

    // merchant_order
    if (topicVal === "merchant_order") {
      const moId = id || raw?.resource?.split("/").pop();

      if (!moId) return res.sendStatus(200);

      const mo = await mpApi(`/merchant_orders/${moId}`);
      const pays = mo?.payments || [];

      for (const pay of pays) {
        if (pay?.status === "approved" && pay?.id) {
          await handleApprovedPayment(String(pay.id));
        }
      }

      return res.sendStatus(200);
    }

    return res.sendStatus(200);
  } catch (e) {
    console.error("[webhook] fatal:", e);
    return res.sendStatus(200);
  }
});

// debug webhook (GET)
router.get("/mp/webhook", (req, res) => {
  log("GET webhook", req.query);
  res.json({ ok: true });
});

module.exports = router;
