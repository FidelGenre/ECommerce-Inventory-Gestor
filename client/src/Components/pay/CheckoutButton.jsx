import React, { useEffect, useMemo, useState } from "react";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";
import s from "./CheckoutButton.module.css";

const PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY;

export default function CheckoutButton({ items, customer, shipping }) {
  const [preferenceId, setPreferenceId] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const normItems = useMemo(
    () =>
      (Array.isArray(items) ? items : [])
        .map((it) => ({
          title: String(it.title || "Producto"),
          quantity: Math.max(1, Number(it.quantity || 1)),
          unit_price:
            typeof it.unit_price === "number"
              ? it.unit_price
              : parseFloat(
                  String(it.unit_price).replace(/[^0-9.-]+/g, "") || "0"
                ),
        }))
        .filter(
          (it) =>
            it.title &&
            Number.isFinite(it.quantity) &&
            it.quantity > 0 &&
            Number.isFinite(it.unit_price) &&
            it.unit_price >= 0.01
        ),
    [items]
  );

  useEffect(() => {
    if (!PUBLIC_KEY) {
      setErr("Falta VITE_MP_PUBLIC_KEY en el frontend (.env).");
      return;
    }
    initMercadoPago(PUBLIC_KEY, { locale: "es-AR" });
  }, []);

  const startCheckout = async () => {
    try {
      if (!normItems.length) {
        setErr("No hay ítems válidos para pagar.");
        return;
      }

      setLoading(true);
      setErr("");

      const payload = {
        items: normItems,        // usa unit_price
        customer: customer || {}, 
        shipping: shipping || {},
      };

      const r = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // IMPORTANTE: para enviar token
        body: JSON.stringify(payload),
      });

      const txt = await r.text();
      let data = {};
      try {
        data = txt ? JSON.parse(txt) : {};
      } catch {
        throw new Error("Respuesta inválida del servidor");
      }

      if (!r.ok) {
        throw new Error(data.error || "No se pudo crear la orden");
      }

      const pref = data.preference_id || data.id;
      if (!pref) throw new Error("No llegó preference_id");

      setPreferenceId(pref);
    } catch (e) {
      setErr(e.message || "Error iniciando checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.wrap}>
      {err && <p className={s.error}>{err}</p>}

      {preferenceId ? (
        <div className={s.walletWrap}>
          <Wallet initialization={{ preferenceId }} />
        </div>
      ) : (
        <button
          className={`${s.payBtn} ${loading ? s.loading : ""}`}
          onClick={startCheckout}
          disabled={loading || !normItems.length}
        >
          {loading ? "Creando orden..." : "Pagar con Mercado Pago"}
        </button>
      )}
    </div>
  );
}
