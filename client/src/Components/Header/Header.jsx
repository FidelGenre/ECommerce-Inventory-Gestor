import React, { useState } from "react";
import styles from "./Header.module.css";
import { useCart } from "../Cart/CartContext";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

function Header({ onCartClick }) {
  const { cart } = useCart();
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const [menuOpen, setMenuOpen] = useState(false);

  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (e, id) => {
    e.preventDefault();
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const section = document.getElementById(id);
        if (section) section.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } else {
      const section = document.getElementById(id);
      if (section) section.scrollIntoView({ behavior: "smooth" });
    }
    setMenuOpen(false);
  };

  const handlePersonClick = () => {
    if (!user) navigate("/login");
    else if (isAdmin) navigate("/admin");
    else navigate("/user");
    setMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      {/* ------------ LOGO ------------ */}
      <div className={styles.logo}>
        <span>Coffee Beans</span>
      </div>

      {/* ------------ NAV ------------ */}
      <nav className={styles.nav}>
        <ul className={`${styles.ul} ${menuOpen ? styles.navOpen : ""}`}>
          {/* ❌ BOTÓN DE CIERRE EN MÓVIL */}
          {menuOpen && (
            <button
              className={styles.closeButton}
              onClick={() => setMenuOpen(false)}
            >
              ✕
            </button>
          )}

          <li className={styles.navItem}>
            <a href="#home" onClick={(e) => handleNavClick(e, "home")}>Inicio</a>
          </li>

          <li className={styles.navItem}>
            <a href="#about" onClick={(e) => handleNavClick(e, "about")}>Nosotros</a>
          </li>

          <li className={styles.navItem}>
            <a href="#menu" onClick={(e) => handleNavClick(e, "menu")}>Productos</a>
          </li>

          <li className={styles.navItem}>
            <a href="#contact" onClick={(e) => handleNavClick(e, "contact")}>Contacto</a>
          </li>
        </ul>
      </nav>

      {/* ------------ BOTONES DERECHA ------------ */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.authButton}
          onClick={handlePersonClick}
        >
          👤
        </button>

        <button
          type="button"
          onClick={onCartClick}
          className={styles.cartButton}
        >
          🛒
          {totalItems > 0 && (
            <span className={styles.cartCount}>{totalItems}</span>
          )}
        </button>

        <button
          type="button"
          className={styles.menuToggle}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>
    </header>
  );
}

export default Header;
