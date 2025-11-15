import React from 'react';
import styles from './Home.module.css';

function Home() {

  const scrollToMenu = () => {
    const menuSection = document.getElementById('menu');
    if (menuSection) {
      menuSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <div className={styles.home}>
        <div className={styles.content}>
          <h2 className={styles.title}>Viví la Esencia del Café</h2>
          <p className={styles.paragraph}>
            Descubrí nuestra selección artesanal de granos de café premium, tostados a la perfección para resaltar los mejores aromas y sabores en cada taza.
          </p>
          <div className={styles.buttons}>
            <button className={styles.primaryBtn} onClick={scrollToMenu}>Explorar Nuestros Blends</button>
          </div>
        </div>
        <div className={styles.imageContainer}>
          <img src="coffeebeanshome.png" alt="Granos de Café" className={styles.logo} />
        </div>
      </div>

      <section className={styles.featuresSection}>
        <h2 className={styles.sectionTitle}>¿Por qué elegir Coffee Beans?</h2>
        <div className={styles.cardsContainer}>
          <div className={styles.card}>
            <h3>Tueste Premium</h3>
            <p>
              Cada lote se tuesta con precisión para lograr el equilibrio perfecto entre aroma, sabor y textura.
            </p>
          </div>
          <div className={styles.card}>
            <h3>El Arte del Café</h3>
            <p>
              Nuestro café se elabora en pequeños lotes por tostadores apasionados que celebran la tradición del café artesanal.
            </p>
          </div>
          <div className={styles.card}>
            <h3>Origen Sustentable</h3>
            <p>
              Trabajamos con fincas éticas que promueven el comercio justo, la sustentabilidad y el respeto por el planeta.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export default Home;
