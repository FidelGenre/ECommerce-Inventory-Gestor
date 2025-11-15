import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import s from "./Login.module.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user?.role === "admin" ? "/admin" : "/user");
    } catch (e) {
      setErr(e.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.wrapper}>
      <div className={s.card}>
        <h2 className={s.title}>☕ Iniciar sesión</h2>

        <form onSubmit={onSubmit} className={s.form}>
          <input
            className={s.input}
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className={s.input}
            placeholder="Contraseña"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          {err && <p className={s.error}>{err}</p>}

          <button type="submit" className={s.submit} disabled={loading}>
            {loading ? "Cargando..." : "Entrar"}
          </button>
        </form>

        <p className={s.linkText}>
          ¿No tenés cuenta?{" "}
          <Link to="/register" className={s.link}>
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}
