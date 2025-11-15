// client/src/Components/Menu/Menu.jsx
import React, { useEffect, useMemo, useState } from "react";
import styles from "./Menu.module.css";
import { useCart } from "../Cart/CartContext";
import { fetchJSON } from "../../lib/http";

const TARGET_TOTAL = 12; // máximo de productos a mostrar

export default function Menu() {
  const [beans, setBeans] = useState([]);
  const { cart, addToCart } = useCart();

  useEffect(() => {
    fetchJSON("/beans")
      .then((data) => setBeans(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error fetching beanstype:", err));
  }, []);

  const getQuantity = (id) => {
    const item = cart.find((i) => i.id === id);
    return item ? item.quantity ?? item.cantidad ?? 0 : 0;
  };

  const formatPrice = (bean) => {
    const cents =
      typeof bean.price_cents === "number"
        ? bean.price_cents
        : Math.round((bean.price ?? 0) * 100);

    return (cents / 100).toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
    });
  };

  // 👉 Mostrar sólo productos visibles (precio > 0)
  const visibleBeans = useMemo(() => {
    let list = Array.isArray(beans) ? [...beans] : [];

    list = list.filter((b) => Number(b.price_cents ?? 0) > 0);

    list.sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0));

    return list.slice(0, TARGET_TOTAL);
  }, [beans]);

  const renderCards = (items) =>
    items.map((bean) => {
      const qtyInCart = getQuantity(bean.id);
      const stock = Number(bean.stock ?? 0);
      const noStock = stock <= 0;
      const reached = qtyInCart >= stock && stock > 0;
      const disabled = noStock || reached;

      return (
        <div key={bean.id} className={styles.card}>
          {bean.image && (
            <img src={bean.image} alt={bean.name} className={styles.image} />
          )}

          <div className={styles.info}>
            <h4>{bean.name}</h4>

            {noStock ? (
              <div
                style={{
                  color: "#b23b23",
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                No hay stock disponible
              </div>
            ) : (
              <div
                style={{
                  color: "#5c3a1e",
                  opacity: 0.8,
                  fontSize: 13,
                  marginBottom: 6,
                }}
              >
                Stock: {stock - qtyInCart}/{stock}
              </div>
            )}

            <div className={styles.footer}>
              <span className={styles.price}>{formatPrice(bean)}</span>

              <button
                className={styles.button}
                onClick={() => addToCart(bean)}
                disabled={disabled}
                title={
                  noStock
                    ? "No hay stock"
                    : reached
                    ? "Ya alcanzaste el stock disponible"
                    : "Agregar al carrito"
                }
                style={{
                  opacity: disabled ? 0.6 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                {noStock
                  ? "Sin stock"
                  : reached
                  ? `Límite (${qtyInCart})`
                  : `Añadir ${qtyInCart > 0 ? `(${qtyInCart})` : ""}`}
              </button>
            </div>
          </div>
        </div>
      );
    });

  return (
    <section className={styles.menu}>
      <h2 className={styles.title}>Nuestra selección de café</h2>
      <p className={styles.subtitle}>
        Explorá nuestros granos artesanales, seleccionados por origen y nivel de
        tueste.
      </p>

      <div className={styles.grid}>{renderCards(visibleBeans)}</div>
    </section>
  );
}
