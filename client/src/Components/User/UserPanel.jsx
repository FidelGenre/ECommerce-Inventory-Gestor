// client/src/components/user/UserPanel.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJSON } from "../../lib/http";
import { useAuth } from "../../auth/AuthContext";
import styles from "./UserPanel.module.css";

export default function UserPanel() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [errGlobal, setErrGlobal] = useState("");

  const [orders, setOrders] = useState([]);
  const [ordersErr, setOrdersErr] = useState("");
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [openOrderNumber, setOpenOrderNumber] = useState(null);
  const [orderDetails, setOrderDetails] = useState({});

  const navigate = useNavigate();

  const loadProfile = async () => {
    setErrGlobal("");
    try {
      const { user } = await fetchJSON("/user/profile");
      setProfile(user);
    } catch (e) {
      setErrGlobal(e.message || "Error cargando perfil");
    }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    setOrdersErr("");
    try {
      const data = await fetchJSON("/orders/my");
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setOrdersErr(e.message || "Error cargando órdenes");
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadOrders();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const toggleDetails = async (orderNumber) => {
    if (openOrderNumber === orderNumber) {
      setOpenOrderNumber(null);
      return;
    }
    if (!orderDetails[orderNumber]) {
      try {
        const data = await fetchJSON(`/orders/by-number/${orderNumber}`);
        setOrderDetails((prev) => ({ ...prev, [orderNumber]: data || {} }));
      } catch (e) {
        setOrdersErr(e.message || "Orden no encontrada");
      }
    }
    setOpenOrderNumber(orderNumber);
  };

  const fmtARS = (n) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(n ?? 0);

  if (!profile) {
    return (
      <div className={styles.loading}>{errGlobal || "Cargando..."}</div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Panel de Usuario</h2>
        {user && (
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            🚪 Cerrar sesión
          </button>
        )}
      </div>

      {/* Perfil */}
      <div className={styles.card}>
        <div className={styles.row}>
          <div className={styles.label}>Nombre:</div>
          <div className={styles.value}>{profile.name}</div>
        </div>
        <div className={styles.row}>
          <div className={styles.label}>Email:</div>
          <div className={styles.value}>{profile.email}</div>
        </div>
        <div className={styles.row}>
          <div className={styles.label}>Rol:</div>
          <div className={styles.value}>{profile.role}</div>
        </div>
        <div className={`${styles.row} ${styles.points}`}>
          <div className={styles.label}>⭐ Puntos:</div>
          <div className={styles.value}>{profile.points ?? 0}</div>
        </div>
      </div>

      {/* Órdenes */}
      <div className={styles.ordersCard}>
        <div className={styles.ordersHeader}>
          <h3>Mis Órdenes</h3>
          <button
            className={styles.refreshBtn}
            onClick={loadOrders}
            disabled={loadingOrders}
          >
            ⟳ {loadingOrders ? "Cargando..." : "Actualizar"}
          </button>
        </div>

        {ordersErr && <p className={styles.error}>{ordersErr}</p>}

        {loadingOrders ? (
          <p className={styles.muted}>Cargando órdenes…</p>
        ) : orders.length === 0 ? (
          <p className={styles.muted}>No tenés órdenes todavía.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nº Orden</th>
                <th>Entrega</th>{/* 👈 nueva columna */}
                <th>Estado</th>
                <th>Total</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.order_number}</td>

                  {/* Siempre mostrar "Retirar en sucursal" */}
                  <td>Retirar en sucursal</td>

                  <td>
                    {o.status === "approved"
                      ? "Aprobada"
                      : o.status === "pending_payment"
                      ? "Pendiente"
                      : o.status}
                  </td>
                  <td>{fmtARS(o.total)}</td>
                  <td>
                    {new Date(o.created_at).toLocaleString("es-AR")}
                  </td>
                  <td>
                    <button
                      className={styles.linkBtn}
                      onClick={() => toggleDetails(o.order_number)}
                    >
                      {openOrderNumber === o.order_number
                        ? "Ocultar"
                        : "Ver detalle"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {openOrderNumber && orderDetails[openOrderNumber]?.items && (
          <div className={styles.detailsBox}>
            <h4>Detalle de ítems — {openOrderNumber}</h4>
            <ul className={styles.itemsList}>
              {orderDetails[openOrderNumber].items.map((it) => (
                <li key={it.id} className={styles.itemRow}>
                  <span className={styles.itemTitle}>{it.title}</span>
                  <span className={styles.itemQty}>x{it.quantity}</span>
                  <span className={styles.itemPrice}>
                    {fmtARS(it.unit_price)}
                  </span>
                  <span className={styles.itemSub}>
                    {fmtARS(it.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {errGlobal && <p className={styles.error}>{errGlobal}</p>}
    </div>
  );
}
