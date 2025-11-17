import { useEffect, useState } from "react";
import { fetchJSON } from "../../../lib/http";
import s from "../AdminPanel.module.css";

const MAX_PROVIDER_PURCHASE_QTY = 100;

/* ===================== Inventario ===================== */

export default function InventoryAdmin() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", min_stock: 0 });
  const [suppliers, setSuppliers] = useState([]);
  const [err, setErr] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [minDraft, setMinDraft] = useState({});

  useEffect(() => {
    loadInventory();
    loadSuppliers();
  }, []);

  const loadInventory = async () => {
    try {
      const data = await fetchJSON("/admin/beans");
      const arr = Array.isArray(data) ? data : [];
      setItems(arr);

      const draft = {};
      arr.forEach((p) => {
        draft[p.id] = p.min_stock ?? 0;
      });
      setMinDraft(draft);
    } catch (e) {
      setErr(e.message || "Error cargando inventario");
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = await fetchJSON("/admin/suppliers");
      setSuppliers(Array.isArray(data) ? data : []);
    } catch {
      setSuppliers([]);
    }
  };

  const assignSupplier = async (beanId, supplierId) => {
    try {
      const sid = supplierId ? Number(supplierId) : null;

      await fetchJSON(`/admin/beans/${beanId}`, {
        method: "PUT",
        body: { supplier_id: sid },
      });

      await loadInventory();
    } catch (e) {
      alert("Error asignando proveedor: " + (e.message || "desconocido"));
    }
  };

  /* =================== Compra individual =================== */

  const handlePurchase = async (bean) => {
    const qtyEl = document.getElementById(`qty-${bean.id}`);
    const costEl = document.getElementById(`cost-${bean.id}`);

    const quantity = Number(qtyEl?.value || 0);
    const unit_cost_ars = Number(costEl?.value || 0);

    if (!quantity || !unit_cost_ars)
      return alert("Cantidad y costo son requeridos");

    if (quantity > MAX_PROVIDER_PURCHASE_QTY)
      return alert(`Máximo ${MAX_PROVIDER_PURCHASE_QTY} unidades por compra.`);

    const supplier_id = bean.supplier_id || null;
    if (!supplier_id)
      return alert("Asigná un proveedor al producto antes de comprar.");

    try {
      await fetchJSON("/admin/purchases", {
        method: "POST",
        body: {
          supplier_id,
          beanstype_id: bean.id,
          quantity,
          unit_cost_ars,
        },
      });

      await loadInventory();
      alert("Compra registrada ✅");

      if (qtyEl) qtyEl.value = "";
      if (costEl) costEl.value = "";
    } catch (e) {
      alert("Error al registrar compra: " + (e.message || "desconocido"));
    }
  };

  /* =================== COMPRA MASIVA =================== */

  const handleBulkPurchase = async () => {
    const list = items
      .map((p) => {
        const qty = Number(document.getElementById(`qty-${p.id}`)?.value || 0);
        const cost = Number(document.getElementById(`cost-${p.id}`)?.value || 0);

        if (!qty || !cost || !p.supplier_id) return null;

        return {
          beanstype_id: p.id,
          quantity: qty,
          unit_cost_ars: cost,
          supplier_id: p.supplier_id,
        };
      })
      .filter(Boolean);

    if (!list.length) {
      return alert("No hay compras válidas. Completá cantidad, costo y proveedor.");
    }

    const totalQty = list.reduce((acc, r) => acc + r.quantity, 0);
    if (totalQty > MAX_PROVIDER_PURCHASE_QTY) {
      return alert(
        `Máximo ${MAX_PROVIDER_PURCHASE_QTY} unidades por operación. Total: ${totalQty}.`
      );
    }

    const groups = new Map();
    for (const it of list) {
      if (!groups.has(it.supplier_id)) groups.set(it.supplier_id, []);
      groups.get(it.supplier_id).push(it);
    }

    try {
      for (const [supplier_id, itemsGroup] of groups.entries()) {
        await fetchJSON("/admin/purchases/bulk", {
          method: "POST",
          body: {
            supplier_id,
            items: itemsGroup.map((i) => ({
              beanstype_id: i.beanstype_id,
              quantity: i.quantity,
              unit_cost_ars: i.unit_cost_ars,
            })),
          },
        });

        await new Promise((r) => setTimeout(r, 200));
      }

      await loadInventory();
      alert("Compra masiva registrada correctamente ✔");

      items.forEach((p) => {
        const q = document.getElementById(`qty-${p.id}`);
        const c = document.getElementById(`cost-${p.id}`);
        if (q) q.value = "";
        if (c) c.value = "";
      });
    } catch (e) {
      alert("Error en compra masiva: " + (e.message || "desconocido"));
    }
  };

  /* =================== Crear producto =================== */

  const createProduct = async (e) => {
    e.preventDefault();

    try {
      const bean = await fetchJSON("/admin/beans", {
        method: "POST",
        body: { name: form.name, price_cents: 0, image: "coffeeall.png" },
      });

      await fetchJSON(`/admin/inventory/${bean.id}`, {
        method: "PATCH",
        body: { stock: 0, min_stock: Number(form.min_stock) || 0 },
      });

      setForm({ name: "", min_stock: 0 });
      await loadInventory();
    } catch (e) {
      setErr(e.message || "Error creando");
    }
  };

  /* =================== Eliminar bean =================== */

  const deleteBean = async (id) => {
    if (!confirm("¿Eliminar este producto y su inventario?")) return;

    try {
      await fetchJSON(`/admin/beans/${id}`, { method: "DELETE" });
      await loadInventory();
    } catch (e) {
      alert("Error eliminando: " + (e.message || "desconocido"));
    }
  };

  /* =================== Guardar mínimo =================== */

  const saveMinStock = async (id) => {
    const newMin = Number(minDraft[id]);
    if (Number.isNaN(newMin) || newMin < 0)
      return alert("Mínimo inválido");

    try {
      await fetchJSON(`/admin/inventory/${id}`, {
        method: "PATCH",
        body: { min_stock: newMin, mode: "set" },
      });

      setEditingId(null);
      await loadInventory();
    } catch (e) {
      alert("Error actualizando mínimo: " + (e.message || "desconocido"));
    }
  };

  /* =================== Render =================== */

  return (
    <div className={s.section}>
      <h3 className={s.h3}>
        Inventario{" "}
        <span
          style={{
            fontSize: "0.85rem",
            fontWeight: 400,
            color: "var(--coffee-700)",
          }}
        >
          (máx. {MAX_PROVIDER_PURCHASE_QTY} unidades por compra a proveedor)
        </span>
      </h3>

      {err && <p className={s.error}>{err}</p>}

      {/* ========== CREAR PRODUCTO ========== */}
      <form
        onSubmit={createProduct}
        className={s.formRow}
        style={{ marginTop: 10 }}
      >
        <input
          className={s.input}
          placeholder="Nombre del producto"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <div />

        <input
          className={s.number}
          type="number"
          placeholder="Mínimo"
          value={form.min_stock}
          onChange={(e) =>
            setForm({ ...form, min_stock: e.target.value })
          }
        />

        <button className={s.submit}>Crear</button>
      </form>

      {/* ========== TABLA INVENTARIO ========== */}
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead className={s.theadSticky}>
            <tr>
              <th className={s.cId}>ID</th>
              <th className={s.cName}>Nombre</th>
              <th className={s.cNum}>Stock</th>
              <th className={s.cNum}>Mínimo</th>
              <th className={`${s.cName} ${s.cProv}`}>Proveedor</th>
              <th className={s.cAct}>Compra</th>
              <th className={s.cAct}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {items.map((p) => {
              const stock = Number(p.stock ?? 0);
              const min = Number(p.min_stock ?? 0);
              const low = stock < min;

              const currentSupplier =
                suppliers.find((x) => x.id === p.supplier_id) || null;

              return (
                <tr key={p.id} className={s.tr}>
                  <td className={s.td}>{p.id}</td>

                  <td className={s.td}>
                    <span className={s.ellipsis}>{p.name}</span>
                    {low && (
                      <span className={s.lowStockTag}>
                        Stock bajo ⚠️
                      </span>
                    )}
                  </td>

                  <td className={s.td}>{stock}</td>

                  <td className={s.td}>
                    {editingId === p.id ? (
                      <input
                        className={s.number}
                        type="number"
                        value={minDraft[p.id]}
                        onChange={(e) =>
                          setMinDraft((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      min
                    )}
                  </td>

                  {/* ========== PROVEEDOR + (medio kilo) ========== */}
                  <td className={s.td}>
                    <div
                      className={s.supplierCell}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <select
                        className={s.supplierSelectSlim}
                        value={p.supplier_id ?? ""}
                        onChange={(e) =>
                          assignSupplier(p.id, e.target.value)
                        }
                      >
                        <option value="">Sin proveedor</option>
                        {suppliers.map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.name}
                            {sp.alias ? ` (${sp.alias})` : ""}
                            {sp.category ? ` - ${sp.category}` : ""}
                          </option>
                        ))}
                      </select>

                      {/* Mostrar "(medio kilo)" si el proveedor es de beans */}
                      {currentSupplier &&
                        currentSupplier.category === "beans" && (
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--coffee-700)",
                            }}
                          >
                            (medio kilo)
                          </span>
                        )}
                    </div>

                    <div className={s.supplierHint}>
                      <span>Actual:</span>
                      <span className={s.supplierCurrent}>
                        {p.supplier_name || "Sin proveedor"}
                      </span>
                    </div>
                  </td>

                  {/* ========== COMPRA RÁPIDA ========== */}
                  <td className={s.td}>
                    <div className={s.purchaseCell}>
                      <input
                        className={s.qtyInput}
                        id={`qty-${p.id}`}
                        type="number"
                        placeholder={`Cant. (máx ${MAX_PROVIDER_PURCHASE_QTY})`}
                        min="1"
                      />

                      <input
                        className={s.costInput}
                        id={`cost-${p.id}`}
                        type="number"
                        placeholder="Costo (ARS)"
                        min="0"
                        step="0.01"
                      />

                      <button
                        type="button"
                        className={s.buyBtn}
                        onClick={() => handlePurchase(p)}
                      >
                        Comprar
                      </button>
                    </div>
                  </td>

                  {/* ========== ACCIONES ========== */}
                  <td className={s.td}>
                    {editingId === p.id ? (
                      <>
                        <button
                          className={s.btn}
                          onClick={() => saveMinStock(p.id)}
                        >
                          Guardar
                        </button>

                        <button
                          className={`${s.btn} ${s.ghost}`}
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </button>

                        <button
                          className={`${s.btn} ${s.danger}`}
                          onClick={() => deleteBean(p.id)}
                        >
                          Borrar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className={s.btn}
                          onClick={() => setEditingId(p.id)}
                        >
                          Editar
                        </button>

                        <button
                          className={`${s.btn} ${s.danger}`}
                          onClick={() => deleteBean(p.id)}
                        >
                          Borrar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}

            {items.length === 0 && (
              <tr>
                <td colSpan={7} className={s.td} style={{ textAlign: "center" }}>
                  Sin productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Compra masiva */}
      <div style={{ marginTop: "1rem", textAlign: "right" }}>
        <button
          type="button"
          className={s.buyBtn}
          onClick={handleBulkPurchase}
        >
          Comprar todos los productos cargados
        </button>
      </div>
    </div>
  );
}
