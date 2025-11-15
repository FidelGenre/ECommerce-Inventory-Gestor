import React, { useEffect, useState } from "react";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";

const PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY;

export default function CheckoutForm({ cartItems }) {
  const [preferenceId, setPreferenceId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [shipping, setShipping] = useState({ address1: "", city: "", province: "", zip: "", notes: "" });

  useEffect(() => {
    if (!PUBLIC_KEY) { setErr("Falta VITE_MP_PUBLIC_KEY"); return; }
    initMercadoPago(PUBLIC_KEY, { locale: "es-AR" });
  }, []);

  const startCheckout = async () => {
    try {
      setErr(""); setLoading(true);
      const body = {
        customer,
        shipping,
        items: (cartItems || []).map(it => ({
          title: it.title,
          quantity: it.quantity,
          unit_price: it.unit_price,
        })),
      };
      const r = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "No se pudo crear la orden");
      setPreferenceId(data.preference_id);
    } catch (e) {
      setErr(e.message || "Error iniciando checkout");
    } finally {
      setLoading(false);
    }
  };

  if (err) return <p style={{ color: "crimson" }}>{err}</p>;

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
      <h3>Datos del cliente</h3>
      <input placeholder="Nombre" value={customer.name} onChange={e=>setCustomer({...customer, name: e.target.value})}/>
      <input placeholder="Email" value={customer.email} onChange={e=>setCustomer({...customer, email: e.target.value})}/>
      <input placeholder="Teléfono" value={customer.phone} onChange={e=>setCustomer({...customer, phone: e.target.value})}/>

      <h3>Envío</h3>
      <input placeholder="Dirección" value={shipping.address1} onChange={e=>setShipping({...shipping, address1: e.target.value})}/>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input placeholder="Ciudad" value={shipping.city} onChange={e=>setShipping({...shipping, city: e.target.value})}/>
        <input placeholder="Provincia" value={shipping.province} onChange={e=>setShipping({...shipping, province: e.target.value})}/>
      </div>
      <input placeholder="Código Postal" value={shipping.zip} onChange={e=>setShipping({...shipping, zip: e.target.value})}/>
      <textarea placeholder="Notas (opcional)" value={shipping.notes} onChange={e=>setShipping({...shipping, notes: e.target.value})}/>

      {preferenceId ? (
        <div style={{ maxWidth: 340 }}>
          <Wallet initialization={{ preferenceId }} />
        </div>
      ) : (
        <button onClick={startCheckout} disabled={loading}>
          {loading ? "Creando orden..." : "Ir a pagar"}
        </button>
      )}
    </div>
  );
}
