import { useEffect, useState } from "react";
import { fetchJSON } from "../../../lib/http";
import s from "../AdminPanel.module.css";

/* ---------- Helpers UI ---------- */
const Pill = ({ ok }) => (
  <span className={`${s.pill} ${ok ? s.pillOk : s.pillNo}`}>
    {ok ? "Visible" : "Oculto"}
  </span>
);

const Thumb = ({ src, alt }) => (
  <div className={s.thumbWrap}>
    {src ? (
      <img className={s.thumb} src={src} alt={alt || "image"} />
    ) : (
      <div className={s.thumbEmpty}>No img</div>
    )}
  </div>
);

/* ===================== Dashboard ===================== */

export default function DashboardPanel() {
  const [dashboard, setDashboard] = useState(null);
  const [err, setErr] = useState("");
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDay, setSelectedDay] = useState("");

  const loadDashboard = async ({ month, day } = {}) => {
    try {
      setErr("");
      setDashboard(null);
      const qs = day
        ? `?day=${encodeURIComponent(day)}`
        : month
        ? `?month=${encodeURIComponent(month)}`
        : "";

      const data = await fetchJSON(`/admin/dashboard${qs}`);

      setDashboard(data);
      setMonths(Array.isArray(data.months) ? data.months : []);
      setSelectedMonth(data.selected_month || month || "");
      setSelectedDay(data.selected_day || day || "");
    } catch (e) {
      setErr(e.message || "Error cargando dashboard");
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (err) return <p className={s.error}>{err}</p>;
  if (!dashboard) return <div className={s.loading}>Cargando datos...</div>;

  const series = dashboard?.series || [];
  const kpiPeriod = dashboard?.meta?.kpi_period === "día" ? "Día" : "Mes";

  const cajaLocal = Number(dashboard?.resumen?.caja_dinero_local || 0);

  /* PRODUCTO MÁS VENDIDO */
  let bestProduct = null;
  if (dashboard && Array.isArray(dashboard.ventas_detalle)) {
    const acc = new Map();

    for (const v of dashboard.ventas_detalle) {
      if (!Array.isArray(v.items)) continue;

      for (const it of v.items) {
        const name = (it.product || "Producto").trim();
        const qty = Number(it.quantity || 0);
        const subtotal = Number(it.subtotal || 0);

        if (!acc.has(name)) acc.set(name, { qty: 0, total: 0 });

        const cur = acc.get(name);
        cur.qty += qty;
        cur.total += subtotal;
      }
    }

    for (const [name, info] of acc.entries()) {
      if (
        !bestProduct ||
        info.qty > bestProduct.qty ||
        (info.qty === bestProduct.qty && info.total > bestProduct.total)
      ) {
        bestProduct = { name, qty: info.qty, total: info.total };
      }
    }
  }

  const topProducts = dashboard.top_products || [];

  const ventasCount = Number(dashboard.resumen?.ventas_count || 0);
  const productosVendidos = Number(
    dashboard.resumen?.productos_vendidos || 0
  );

  return (
    <div className={s.section}>
      {/* FILTROS */}
      <div
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 500 }}>Período:</span>

        <select
          className={s.input}
          style={{ maxWidth: 220 }}
          value={selectedMonth}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedMonth(v);
            setSelectedDay("");
            loadDashboard({ month: v || undefined });
          }}
        >
          <option value="">Mes actual</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <span style={{ color: "#666" }}>o</span>

        <input
          className={s.input}
          style={{ maxWidth: 180 }}
          type="date"
          value={selectedDay}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedDay(v);
            setSelectedMonth("");
            loadDashboard({ day: v || undefined });
          }}
        />

        {selectedDay && (
          <button
            className={`${s.btn} ${s.ghost}`}
            onClick={() => {
              setSelectedDay("");
              loadDashboard({ month: selectedMonth || undefined });
            }}
          >
            Limpiar día
          </button>
        )}
      </div>

      {/* KPIS PRINCIPALES */}
      <div className={s.kpisGrid}>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Ventas del {kpiPeriod}</div>
          <div className={s.kpiValue}>
            ${Number(dashboard.resumen.ventas_mes).toLocaleString("es-AR")}
          </div>
        </div>

        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Compras del {kpiPeriod}</div>
          <div className={s.kpiValue}>
            ${Number(dashboard.resumen.compras_mes).toLocaleString("es-AR")}
          </div>
        </div>

        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Ganancia Neta</div>
          <div
            className={`${s.kpiValue} ${
              Number(dashboard.resumen.ganancia_mes) >= 0
                ? s.deltaUp
                : s.deltaDown
            }`}
          >
            ${Number(dashboard.resumen.ganancia_mes).toLocaleString("es-AR")}
          </div>
        </div>

        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Caja del local</div>
          <div className={s.kpiValue}>
            ${cajaLocal.toLocaleString("es-AR")}
          </div>
        </div>
      </div>

      {/* KPIS EXTRAS */}
      <div className={s.kpisGrid} style={{ marginTop: "1.5rem" }}>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Ventas realizadas</div>
          <div className={s.kpiValue}>{ventasCount}</div>
        </div>

        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Productos vendidos</div>
          <div className={s.kpiValue}>{productosVendidos}</div>
        </div>
      </div>

      {/* PRODUCTOS MÁS VENDIDOS */}
      <div className={s.kpisGrid} style={{ marginTop: "1.5rem" }}>
        {[bestProduct, ...topProducts.slice(1, 3)].map((p, index) => {
          if (!p) return null;

          const name = p.name || p.product;
          const qty = p.qty || p.total_qty || 0;
          const total = p.total || p.total_ars || 0;

          return (
            <div key={index} className={s.kpiCard}>
              <div className={s.kpiLabel}>
                {index === 0
                  ? `🥇 Producto más vendido del ${kpiPeriod.toLowerCase()}`
                  : index === 1
                  ? "🥈 Segundo más vendido"
                  : "🥉 Tercer más vendido"}
              </div>

              <div className={s.kpiValue}>{name}</div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: "0.9rem",
                  color: "#666",
                  display: "flex",
                  gap: "1.5rem",
                  flexWrap: "wrap",
                }}
              >
                <span>
                  Cantidad:{" "}
                  <strong>{qty.toLocaleString("es-AR")}</strong>
                </span>

                <span>
                  Total:{" "}
                  <strong>
                    ${Number(total).toLocaleString("es-AR")}
                  </strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* RESUMEN HISTÓRICO */}
      <div className={s.card} style={{ marginTop: "2rem" }}>
        <div className={s.cardHeader}>
          <h3 className={s.cardTitle}>Resumen histórico</h3>
        </div>

        <div className={s.cardBody}>
          <table className={s.seriesTable}>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Ventas</th>
                <th>Compras</th>
                <th>Ganancia</th>
              </tr>
            </thead>

            <tbody>
              {series.map((r) => (
                <tr key={r.ym}>
                  <td>{r.ym}</td>
                  <td>${Number(r.ventas).toLocaleString("es-AR")}</td>
                  <td>${Number(r.compras).toLocaleString("es-AR")}</td>
                  <td
                    className={
                      Number(r.ventas) - Number(r.compras) >= 0
                        ? s.deltaUp
                        : s.deltaDown
                    }
                  >
                    {(
                      Number(r.ventas) - Number(r.compras)
                    )
                      .toLocaleString("es-AR", {
                        style: "currency",
                        currency: "ARS",
                      })
                      .replace("ARS", "$")}
                  </td>
                </tr>
              ))}

              {series.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center" }}>
                    Sin datos todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
