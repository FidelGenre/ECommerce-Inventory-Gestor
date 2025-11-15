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

/* ===================== Productos ===================== */

export default function ProductsAdmin() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});

  const load = async () => {
    try {
      const data = await fetchJSON("/admin/beans");
      const arr = Array.isArray(data) ? data : [];
      setItems(arr);

      const d = {};
      arr.forEach(
        (p) =>
          (d[p.id] = {
            name: p.name || "",
            image: p.image || "coffeeall.png",
            priceArs: ((p.price_cents ?? 0) / 100).toString(),
          })
      );
      setDraft(d);
    } catch (e) {
      setErr(e.message || "Error cargando productos");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onChange = (id, k, v) =>
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], [k]: v } }));

  const saveRow = async (id) => {
    const d = draft[id] || {};
    const priceCents = Math.max(
      0,
      Math.round(Number(d.priceArs || 0) * 100)
    );

    try {
      await fetchJSON(`/admin/beans/${id}`, {
        method: "PUT",
        body: { name: d.name, image: d.image, price_cents: priceCents },
      });
      setEditing(null);
      await load();
    } catch (e) {
      setErr(e.message || "Error guardando");
    }
  };

  const hideRow = async (id) => {
    if (!confirm("¿Ocultar este producto del frontend?")) return;

    try {
      await fetchJSON(`/admin/beans/${id}`, {
        method: "PUT",
        body: { price_cents: 0 },
      });
      setEditing(null);
      await load();
    } catch (e) {
      setErr(e.message || "Error ocultando");
    }
  };

  return (
    <div className={s.section}>
      <h3 className={s.h3}>Productos (visibilidad + edición)</h3>
      {err && <p className={s.error}>{err}</p>}

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead className={s.theadSticky}>
            <tr>
              <th className={s.cId}>ID</th>
              <th className={s.cVis}>Estado</th>
              <th className={s.cName}>Nombre</th>
              <th className={s.cImg}>Imagen</th>
              <th className={s.cNum}>Precio (ARS)</th>
              <th className={s.cAct}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {items.map((p) => {
              const vis = (p.price_cents ?? 0) > 0;
              const d = draft[p.id] || {
                name: "",
                image: "",
                priceArs: "0",
              };

              return (
                <tr key={p.id} className={s.tr}>
                  <td className={s.td}>{p.id}</td>

                  <td className={s.td}>
                    <Pill ok={vis} />
                  </td>

                  <td className={s.td}>
                    {editing === p.id ? (
                      <input
                        className={s.inputSmall}
                        value={d.name}
                        onChange={(e) =>
                          onChange(p.id, "name", e.target.value)
                        }
                      />
                    ) : (
                      <span className={s.ellipsis}>{p.name}</span>
                    )}
                  </td>

                  <td className={s.td}>
                    <div className={s.imgCell}>
                      <Thumb src={p.image} alt={p.name} />

                      {editing === p.id && (
                        <input
                          className={s.inputSmall}
                          placeholder="filename (ej: coffeeall.png)"
                          value={d.image ? d.image.split("/").pop() : ""}
                          onChange={(e) =>
                            onChange(
                              p.id,
                              "image",
                              e.target.value.split("/").pop()
                            )
                          }
                        />
                      )}
                    </div>
                  </td>

                  <td className={s.td}>
                    {editing === p.id ? (
                      <input
                        className={s.inputSmall}
                        type="number"
                        step="0.01"
                        min="0"
                        value={d.priceArs}
                        onChange={(e) =>
                          onChange(p.id, "priceArs", e.target.value)
                        }
                      />
                    ) : (
                      ((p.price_cents ?? 0) / 100).toLocaleString("es-AR")
                    )}
                  </td>

                  <td className={s.td}>
                    {editing === p.id ? (
                      <>
                        <button
                          className={s.btn}
                          onClick={() => saveRow(p.id)}
                        >
                          Guardar
                        </button>

                        <button
                          className={`${s.btn} ${s.ghost}`}
                          onClick={() => setEditing(null)}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className={s.btn}
                          onClick={() => setEditing(p.id)}
                        >
                          Editar
                        </button>

                        {/* Solo OCULTAR */}
                        <button
                          className={`${s.btn} ${s.danger}`}
                          onClick={() => hideRow(p.id)}
                        >
                          Ocultar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}

            {items.length === 0 && (
              <tr>
                <td className={s.td} colSpan={6} style={{ textAlign: "center" }}>
                  Sin productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
