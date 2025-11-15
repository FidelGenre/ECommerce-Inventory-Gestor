// client/src/Components/Cart/FloatingCartButton.jsx
import React, { useEffect, useState } from "react";
import { useCart } from "./CartContext";
import styles from "./FloatingCartButton.module.css";

/**
 * Botón flotante que abre el carrito 🛒
 * Muestra el total de items como badge rojo
 * Aparece al scrollear más de 100px
 */
export default function FloatingCartButton({ onClick }) {
  const { cart } = useCart();
  const [visible, setVisible] = useState(false);

  // Calcular total de ítems en el carrito
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Mostrar el botón solo si se scrollea
  useEffect(() => {
    const handleScroll = () => {
      const scroll = document.documentElement.scrollTop;
      setVisible(scroll > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <button
      type="button"
      className={`${styles.floatingCart} ${visible ? styles.visible : ""}`}
      onClick={onClick}
      aria-label="Abrir carrito"
    >
      <span className={styles.cartIcon}>🛒</span>
      {totalItems > 0 && (
        <span className={styles.badge}>{totalItems}</span>
      )}
    </button>
  );
}
