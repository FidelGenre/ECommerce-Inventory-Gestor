import { useEffect, useState } from "react";
import { fetchJSON } from "../../../lib/http";
import s from "../AdminPanel.module.css";

const aliasRegex = /^[a-z0-9._-]{4,30}$/;

/* ===================== Proveedores ===================== */

export default function SuppliersAdmin() {
  const [suppliers, setSuppliers] = useState([]);
  const [err, setErr] = useState("");
  const [paying, setPaying] = useState(null);
  const [openMap, setOpenMap] = useState({});
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDay, setSelectedDay] = useState("");

  const [spForm, setSpForm] = useState({
    name: "",
    alias: "",
    email: "",
    address: "",
    category: "beans",
  });

  /* Cargar mes actual al iniciar */
  useEffect(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    setSelectedMonth(currentMonth);
    loadSuppliers({ month: currentMonth });
  }, []);

  /* Cargar lista completa sin filtro */
  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async (filters = {}) => {
    try {
      let url = "/admin/suppliers";

      const params = new URLSearchParams(filters);
      if ([...params].length > 0) url += "?" + params.toString();

      const data = await fetchJSON(url);
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || "Error cargando proveedores");
      setSuppliers([]);
    }
  };

  const normalizeAlias = (a) =>
    String(a || "").toLowerCase().replace(/\s+/g, "");

  const createSupplier = async (e) => {
    e.preventDefault();

    if (!spForm.name.trim()) return alert("Ingresá el nombre del proveedor.");

    const alias = normalizeAlias(spForm.alias);
    if (!aliasRegex.test(alias)) return alert("Alias inválido.");

    try {
      await fetchJSON("/admin/suppliers", {
        method: "POST",
        body: {
          name: spForm.name.trim(),
          alias,
          email: spForm.email.trim() || undefined,
          address: spForm.address.trim() || undefined,
          category: spForm.category,
        },
      });

      await loadSuppliers();
      alert("Proveedor creado 👉✔");

      setSpForm({
        name: "",
        alias: "",
        email: "",
        address: "",
        category: "beans",
      });
    } catch (e) {
      alert("Error creando proveedor: " + e.message);
    }
  };

  const deleteSupplier = async (supplierId) => {
    if (!confirm("¿Eliminar proveedor?")) return;

    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const json = await res.json();
      if (!res.ok) return alert(json.error || "Error eliminando proveedor");

      await loadSuppliers();
      alert("Proveedor eliminado ✔");
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const paySupplier = async (supplierId) => {
    if (!confirm("¿Confirmar pago total de la deuda?")) return;

    setPaying(supplierId);

    try {
      const res = await fetch(`/api/admin/suppliers/${supplierId}/pay`, {
        method: "POST",
        credentials: "include",
      });

      const json = await res.json();
      if (!res.ok) alert(json.error || "Error al pagar");
      else alert(`Pago realizado: $${json.pagado_ars.toFixed(2)} ARS`);

      await loadSuppliers();
    } catch (e) {
      alert("Error: " + e.message);
    }

    setPaying(null);
  };

  const toggleOpen = (id) => {
    setOpenMap((p) => ({ ...p, [id]: !p[id] }));
  };

  return (
    <div className={s.section}>
      <h3 className={s.h3}>Proveedores</h3>
      {err && <p className={s.error}>{err}</p>}

      {/* ---------------- FORM ---------------- */}
      <form
        onSubmit={createSupplier}
        className={s.formRow}
        style={{ marginBottom: 10 }}
      >
        <input
          className={s.input}
          placeholder="Nombre"
          value={spForm.name}
          onChange={(e) => setSpForm({ ...spForm, name: e.target.value })}
          required
        />

        <input
          className={s.input}
          placeholder="Alias"
          value={spForm.alias}
          onChange={(e) => setSpForm({ ...spForm, alias: e.target.value })}
          required
        />

        <input
          className={s.input}
          placeholder="Email"
          type="email"
          value={spForm.email}
          onChange={(e) => setSpForm({ ...spForm, email: e.target.value })}
        />

        <input
          className={s.input}
          placeholder="Dirección"
          value={spForm.address}
          onChange={(e) => setSpForm({ ...spForm, address: e.target.value })}
        />

        <select
          className={s.input}
          value={spForm.category}
          onChange={(e) => setSpForm({ ...spForm, category: e.target.value })}
        >
          <option value="beans">beans</option>
          <option value="bags">bags</option>
        </select>

        <button className={s.submit}>Crear</button>
      </form>

      {/* ---------------- FILTROS ---------------- */}
      <div className={s.filtersRow}>
        {/* FILTRO POR DÍA (from / to) */}
        <input
          type="date"
          className={s.input}
          value={selectedDay}
          onChange={(e) => {
            const day = e.target.value;
            setSelectedDay(day);
            setSelectedMonth("");

            if (day) {
              loadSuppliers({
                from: day,
                to: day,
              });
            } else {
              loadSuppliers();
            }
          }}
        />

        {/* FILTRO POR MES */}
        <input
          type="month"
          className={s.input}
          value={selectedMonth}
          onChange={(e) => {
            const month = e.target.value;
            setSelectedMonth(month);
            setSelectedDay("");

            if (month) {
              loadSuppliers({ month });
            } else {
              loadSuppliers();
            }
          }}
        />
      </div>

      {/* ---------------- LISTA ---------------- */}
      <div className={s.providersGrid}>
        {suppliers.map((sp) => {
          const totalInvertido =
            sp.purchases?.reduce(
              (acc, p) => acc + Number(p.subtotal_ars || 0),
              0
            ) || 0;

          const open = openMap[sp.id] || false;

          return (
            <div key={sp.id} className={s.providerCard}>
              <div className={s.providerHeader}>
                <strong>{sp.name}</strong>
                <span className={s.providerMeta}>
                  {sp.alias && " · " + sp.alias}
                  {sp.category && ` (${sp.category})`}
                  {sp.email && " · " + sp.email}
                  {sp.address && " · " + sp.address}
                </span>
              </div>

              <div className={s.totalInvertido}>
                <strong>Total invertido: </strong>
                <span>${totalInvertido.toLocaleString("es-AR")}</span>
              </div>

              <button className={s.toggleBtn} onClick={() => toggleOpen(sp.id)}>
                {open ? "Ocultar compras" : "Ver compras"}
              </button>

              {open && (
                <div className={s.historyBox}>
                  {!sp.purchases || sp.purchases.length === 0 ? (
                    <div style={{ color: "#777" }}>
                      No hay compras registradas.
                    </div>
                  ) : (
                    <ul className={s.historyList}>
                      {sp.purchases.map((c, i) => (
                        <li key={i} className={s.historyItem}>
                          <span>
                            📦 {c.product_name} — {c.quantity} u
                          </span>
                          <span style={{ marginLeft: 8 }}>
                            (${c.subtotal_ars.toLocaleString("es-AR")})
                          </span>
                          <div style={{ fontSize: "0.8rem", color: "#666" }}>
                            {new Date(c.created_at).toLocaleString("es-AR")}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className={s.providerActions}>
                <button
                  className={s.danger}
                  onClick={() => deleteSupplier(sp.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
