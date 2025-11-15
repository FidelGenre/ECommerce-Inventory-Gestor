import { useEffect, useState, Fragment } from "react";
import { fetchJSON } from "../../../lib/http";
import s from "../AdminPanel.module.css";

/* ===================== Registros ===================== */

export default function RegistrosPanel() {
  const [dashboard, setDashboard] = useState(null);
  const [err, setErr] = useState("");
  const [openOrder, setOpenOrder] = useState(null);
  const [openPurchase, setOpenPurchase] = useState(null);
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

      setDashboard({
        ...data,
        top_products: data.top_products || []
      });

      setMonths(Array.isArray(data.months) ? data.months : []);
      setSelectedMonth(data.selected_month || month || "");
      setSelectedDay(data.selected_day || day || "");
      setOpenOrder(null);
      setOpenPurchase(null);
    } catch (e) {
      setErr(e.message || "Error cargando registros");
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (err) return <p className={s.error}>{err}</p>;

  const isGenericSupplier = (v) => {
    const n = String(v || "").trim().toLowerCase();
    return (
      !n ||
      n === "-" ||
      n === "sin proveedor" ||
      n === "proveedor" ||
      n === "provedor"
    );
  };

  const displaySupplier = (purchase) => {
    if (!purchase) return "-";
    if (!isGenericSupplier(purchase.supplier_name)) return purchase.supplier_name;
    if (!isGenericSupplier(purchase.supplier)) return purchase.supplier;

    const names = Array.from(
      new Set(
        (purchase.items || [])
          .map((it) => it.supplier_name || it.supplier)
          .filter((x) => !isGenericSupplier(x))
      )
    );

    if (names.length === 0) return "-";
    if (names.length === 1) return names[0];

    return `Varios: ${names.join(", ")}`;
  };

  return (
    <div className={s.section}>
      {!dashboard ? (
        <div className={s.loading}>Cargando registros...</div>
      ) : (
        <>
          {/* ================== FILTROS ================== */}
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

          <div className={s.dualGrid}>
            {/* ================== VENTAS ================== */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <h3 className={s.cardTitle}>Ventas a clientes</h3>
              </div>

              <div className={s.cardBody}>
                <div className={s.tableScroll}>
                  <table className={s.seriesTable}>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Orden</th>
                        <th>Usuario</th>
                        <th>Total</th>
                        <th>Items</th>
                      </tr>
                    </thead>

                    <tbody>
                      {(dashboard.ventas_detalle || []).map((v) => {
                        const isOpen = openOrder === v.order_number;
                        const hasItems =
                          Array.isArray(v.items) && v.items.length > 0;

                        return (
                          <Fragment key={v.order_number}>
                            <tr>
                              <td>
                                {new Date(v.created_at).toLocaleString("es-AR")}
                              </td>
                              <td>{v.order_number}</td>
                              <td>{v.user_name || "-"}</td>
                              <td>
                                ${Number(v.total || 0).toLocaleString("es-AR")}
                              </td>
                              <td>
                                {hasItems ? (
                                  <button
                                    className={s.btn}
                                    onClick={() =>
                                      setOpenOrder(
                                        isOpen ? null : v.order_number
                                      )
                                    }
                                  >
                                    {isOpen ? "Ocultar items" : "Ver items"}
                                  </button>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>

                            {isOpen && hasItems && (
                              <tr>
                                <td colSpan={5}>
                                  <table className={s.seriesTable}>
                                    <thead>
                                      <tr>
                                        <th>Producto</th>
                                        <th>Cantidad</th>
                                        <th>Precio unit.</th>
                                        <th>Subtotal</th>
                                      </tr>
                                    </thead>

                                    <tbody>
                                      {v.items.map((it, idx) => (
                                        <tr key={idx}>
                                          <td>{it.product || "-"}</td>
                                          <td>{it.quantity ?? "-"}</td>
                                          <td>
                                            {it.unit_price != null
                                              ? `$${Number(
                                                  it.unit_price
                                                ).toLocaleString("es-AR")}`
                                              : "-"}
                                          </td>
                                          <td>
                                            {it.subtotal != null
                                              ? `$${Number(
                                                  it.subtotal
                                                ).toLocaleString("es-AR")}`
                                              : "-"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}

                      {(!dashboard.ventas_detalle ||
                        dashboard.ventas_detalle.length === 0) && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center" }}>
                            Sin ventas en el período.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ================== COMPRAS ================== */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <h3 className={s.cardTitle}>Compras a proveedores</h3>
              </div>

              <div className={s.cardBody}>
                <div className={s.tableScroll}>
                  <table className={s.seriesTable}>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Proveedor</th>
                        <th>Usuario</th>
                        <th>Total</th>
                        <th>Items</th>
                      </tr>
                    </thead>

                    <tbody>
                      {(dashboard.compras_detalle || []).map((c, i) => {
                        const isOpen = openPurchase === i;
                        const hasItems =
                          Array.isArray(c.items) && c.items.length > 0;

                        return (
                          <Fragment key={i}>
                            <tr>
                              <td>
                                {new Date(c.created_at).toLocaleString("es-AR")}
                              </td>
                              <td>{displaySupplier(c)}</td>
                              <td>{c.user_name || "-"}</td>
                              <td>
                                {c.total != null
                                  ? `$${Number(c.total).toLocaleString("es-AR")}`
                                  : "-"}
                              </td>
                              <td>
                                {hasItems ? (
                                  <button
                                    className={s.btn}
                                    onClick={() =>
                                      setOpenPurchase(isOpen ? null : i)
                                    }
                                  >
                                    {isOpen ? "Ocultar items" : "Ver items"}
                                  </button>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>

                            {isOpen && hasItems && (
                              <tr>
                                <td colSpan={5}>
                                  <table className={s.seriesTable}>
                                    <thead>
                                      <tr>
                                        <th>Producto</th>
                                        <th>Cantidad</th>
                                        <th>Costo unit.</th>
                                        <th>Subtotal</th>
                                      </tr>
                                    </thead>

                                    <tbody>
                                      {c.items.map((it, idx) => (
                                        <tr key={idx}>
                                          <td>{it.product || "-"}</td>
                                          <td>{it.quantity ?? "-"}</td>
                                          <td>
                                            {(() => {
                                              const qty = Number(
                                                it.quantity || 0
                                              );
                                              let unit = it.unit_cost_ars;

                                              if (
                                                unit == null &&
                                                it.unit_price != null
                                              )
                                                unit = it.unit_price;

                                              if (
                                                (unit == null ||
                                                  Number.isNaN(Number(unit))) &&
                                                it.subtotal != null &&
                                                qty > 0
                                              ) {
                                                unit =
                                                  Number(it.subtotal) / qty;
                                              }

                                              return unit != null &&
                                                !Number.isNaN(Number(unit))
                                                ? `$${Number(
                                                    unit
                                                  ).toLocaleString("es-AR")}`
                                                : "-";
                                            })()}
                                          </td>
                                          <td>
                                            {it.subtotal != null
                                              ? `$${Number(
                                                  it.subtotal
                                                ).toLocaleString("es-AR")}`
                                              : "-"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}

                      {(!dashboard.compras_detalle ||
                        dashboard.compras_detalle.length === 0) && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center" }}>
                            Sin compras en el período.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
