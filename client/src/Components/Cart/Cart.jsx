import React, { useMemo, useState } from "react";
import styles from "./Cart.module.css";
import { useCart } from "./CartContext";
import CheckoutButton from "../../components/pay/CheckoutButton";

function centsFromItem(it) {
  if (it?.price_cents !== undefined && it?.price_cents !== null) {
    const n = Number(it.price_cents);
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  }
  if (it?.price !== undefined && it?.price !== null) {
    const n = Number(it.price);
    return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0;
  }
  return 0;
}

function qtyFromItem(it) {
  const n = Number(it?.quantity ?? it?.cantidad ?? 1);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function titleFromItem(it) {
  return String(it?.title || it?.name || "Producto");
}

export default function Cart({ isOpen, onClose }) {
  const { cart, removeOne, clearCart } = useCart();
  const [err, setErr] = useState("");

  const totalArs = useMemo(() => {
    return cart.reduce((acc, it) => {
      const cents = centsFromItem(it);
      const qty = qtyFromItem(it);
      return acc + (cents / 100) * qty;
    }, 0);
  }, [cart]);

  const checkoutItems = useMemo(() => {
    const items = cart.map((it) => {
      const cents = centsFromItem(it);
      const qty = qtyFromItem(it);
      return {
        id: it.id,
        title: titleFromItem(it),
        quantity: qty,
        unit_price: cents / 100,
      };
    });

    const invalid = items.filter(
      (i) =>
        !i.title ||
        !Number.isFinite(i.quantity) ||
        i.quantity <= 0 ||
        !Number.isFinite(i.unit_price) ||
        i.unit_price < 0.01
    );
    setErr(invalid.length ? "Hay ítems con precio o cantidad inválidos." : "");
    return items;
  }, [cart]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>

        <h2>Tu carrito</h2>
        {err && <p style={{ color: "#b23b23", fontWeight: 700 }}>{err}</p>}

        <div className={styles.items}>
          {cart.length === 0 && <p>No hay productos en el carrito.</p>}

          {cart.map((item) => {
            const unitArs = (centsFromItem(item) / 100).toLocaleString("es-AR");
            const qty = qtyFromItem(item);
            const title = titleFromItem(item);
            return (
              <div className={styles.item} key={item.id}>
                <img
                  className={styles.img}
                  src={item.image || "/images/coffeeall.png"}
                  alt={title}
                />
                <div>
                  <div style={{ fontWeight: 700 }}>{title}</div>
                  <div style={{ opacity: 0.8, fontSize: 14, marginTop: 2 }}>
                    Cantidad: {qty} — Precio: ${unitArs}
                  </div>
                </div>

                <button
                  className={styles.removeBtn}
                  onClick={() => removeOne(item.id)}
                >
                  Quitar
                </button>
              </div>
            );
          })}
        </div>

        {cart.length > 0 && (
          <>
            <div style={{ marginTop: 16, fontWeight: 800 }}>
              Total: ${totalArs.toLocaleString("es-AR")}
            </div>

            <button className={styles.clearBtn} onClick={clearCart}>
              Vaciar carrito
            </button>

            <CheckoutButton items={checkoutItems} />
          </>
        )}
      </div>
    </div>
  );
}
