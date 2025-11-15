// AboutUs.jsx
import React from 'react';
import styles from './About.module.css';

function About() {
  return (
    <section className={styles.about}>
      <div className={styles.title}>
        <h2>Sobre Coffee Beans</h2>
        <p>Descubrí la historia detrás de Coffee Beans y nuestra pasión por crear la taza perfecta</p>
      </div>

      <div className={styles.history}>
        <div className={styles.text}>
          <h3>Nuestra Historia</h3>
          <p>
            Coffee Beans nació de una idea simple: compartir nuestro amor por el café auténtico y de alta calidad. 
            Lo que comenzó como una pequeña tostadora local se transformó en una comunidad de amantes del café 
            que valoran el sabor, la artesanía y la sustentabilidad.
          </p>
          <br />
          <p>
            Nuestra filosofía se basa en la frescura, la dedicación y el respeto por cada grano. 
            Desde la selección cuidadosa hasta el tueste artesanal, cada paso está guiado por nuestra misión 
            de brindarte una experiencia inolvidable en cada taza.
          </p>
        </div>
        <div className={styles.image}>
          <img src="coffeebeansabout.png" alt="Tostadora de café" />
        </div>
      </div>

      <div className={styles.cards}>
        <div className={styles.card}>
          <span className="material-icons">☕</span>
          <h4>Pasión por el Café</h4>
          <p>Cada tueste se realiza con cuidado, resaltando el carácter único de cada grano.</p>
        </div>
        <div className={styles.card}>
          <span className="material-icons">🌱</span>
          <h4>Sustentabilidad</h4>
          <p>Trabajamos con fincas éticas para promover el comercio justo y cuidar el medio ambiente.</p>
        </div>
        <div className={styles.card}>
          <span className="material-icons">🏆</span>
          <h4>Calidad Excepcional</h4>
          <p>Seleccionamos solo granos premium y los tostamos en pequeños lotes para garantizar la frescura máxima.</p>
        </div>
      </div>
    </section>
  );
}

export default About;