import React from "react";
import styles from "./Footer.module.css";

function Footer() {

  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.columns}>
        <div className={styles.column}>
          <h3>Coffee Beans</h3>
          <p>
            Café artesanal tostado con pasión y precisión para resaltar los mejores sabores en cada taza.
          </p>
        </div>

        <div className={styles.column}>
          <h3>Contacto</h3>
          <p className={styles.icon}>Eva Peron 2641 (Sucursal)</p>
          <p className={styles.icon}>+54 3426 102734</p>
          <p className={styles.icon}>coffeebeansweb@gmail.com</p>
        </div>

        <div className={styles.column}>
          <h3>Horarios</h3>
          <p className={styles.icon}>Lun - Vie: 8:00 a 20:00</p>
          <p className={styles.icon}>Sáb - Dom: 9:00 a 21:00</p>
        </div>

        <div className={styles.column}>
          <h3>Enlaces</h3>
          <p style={{ cursor: 'pointer' }} onClick={() => scrollToSection('menu')}>Nuestros Blends</p>
          <p style={{ cursor: 'pointer' }} onClick={() => scrollToSection('about')}>Sobre Nosotros</p>
          <p style={{ cursor: 'pointer' }} onClick={() => scrollToSection('footer')}>Contacto</p>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>© 2025 Coffee Beans. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}

export default Footer;
