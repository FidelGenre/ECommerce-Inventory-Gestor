"use client"

import { useState } from "react"
import styles from "./Contact.module.css"

export default function Contact() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" })
  const [status, setStatus] = useState({ sending: false, text: "" })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus({ sending: true, text: "Enviando..." })

    try {
      const fd = new FormData(e.target)
      fd.append("access_key", "53f6ecd8-9781-465b-8435-dfa11c9b6000")
      fd.append("subject", "Nuevo mensaje desde el formulario de contacto de Coffee Beans")
      fd.append("replyto", formData.email)
      fd.append("to", "coffeebeansweb@gmail.com")

      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: fd,
      })

      const data = await res.json()
      console.log("Respuesta de Web3Forms:", data)

      if (data.success) {
        setStatus({ sending: false, text: "✅ ¡Mensaje enviado con éxito!" })
        setFormData({ name: "", email: "", message: "" })
        e.target.reset()
      } else {
        setStatus({ sending: false, text: `❌ ${data.message || "Ocurrió un error inesperado."}` })
      }
    } catch (err) {
      console.error("Error de red:", err)
      setStatus({ sending: false, text: "❌ Error de conexión. Intentalo nuevamente." })
    }
  }

  return (
    <section id="contact" className={styles.contact}>
      <div className={styles.container}>
        <h2 className={styles.title}>Contacto Coffee Beans</h2>
        <p className={styles.subtitle}>
          ¿Tenés alguna pregunta sobre nuestros granos o querés colaborar con nosotros?  
          Ponete en contacto — nos encantaría escucharte y compartir nuestra pasión por el café.
        </p>

        <div className={styles.content}>
          <div className={styles.contactInfo}>
            <h3 className={styles.infoTitle}>Ponete en contacto</h3>

            <div className={styles.infoItem}>
              <div className={styles.iconWrapper}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M22 6l-10 7L2 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span>coffeebeansweb@gmail.com</span>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.iconWrapper}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span>+54 3426 102734</span>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.iconWrapper}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="10"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span>Argentina</span>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <input type="hidden" name="from_name" value="Formulario de contacto Coffee Beans" />
            <input type="checkbox" name="botcheck" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>Nombre</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={styles.input}
                placeholder="Ingresá tu nombre"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>Correo electrónico</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={styles.input}
                placeholder="Ingresá tu correo"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="message" className={styles.label}>Mensaje</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                className={styles.textarea}
                placeholder="Escribí tu mensaje aquí..."
                rows="6"
                required
              />
            </div>

            <button type="submit" className={styles.submitButton} disabled={status.sending}>
              {status.sending ? "Enviando..." : "Enviar mensaje"}
            </button>

            {status.text && <p className={styles.status}>{status.text}</p>}
          </form>
        </div>
      </div>
    </section>
  )
}
