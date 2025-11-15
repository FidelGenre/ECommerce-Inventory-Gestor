import React, { createContext, useContext, useMemo, useState } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  const getQty = (id) => cart.find((i) => i.id === id)?.quantity ?? 0;

  const addToCart = (product) => {
    const id = product.id;
    const current = getQty(id);
    const stock = Number(product.stock ?? Infinity);

    if (current + 1 > stock) {
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) {
        return [
          ...prev,
          {
            id,
            title: product.title || product.name || "Producto",
            price_cents:
              typeof product.price_cents === "number"
                ? product.price_cents
                : Math.round((Number(product.price || 0) || 0) * 100),
            image: product.image || "/images/coffeeall.png",
            quantity: 1,
          },
        ];
      } else {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
    });
  };

  const removeOne = (id) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      const item = prev[idx];
      const qty = item.quantity - 1;
      if (qty <= 0) {
        return prev.filter((i) => i.id !== id);
      }
      const next = [...prev];
      next[idx] = { ...item, quantity: qty };
      return next;
    });
  };

  const removeAll = (id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCart = () => setCart([]);

  const totalItems = useMemo(
    () => cart.reduce((sum, it) => sum + (it.quantity || 0), 0),
    [cart]
  );

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeOne, removeAll, clearCart, totalItems }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
