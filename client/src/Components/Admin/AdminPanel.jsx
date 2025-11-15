import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import s from "./AdminPanel.module.css";

/* Import de los paneles separados */
import DashboardPanel from "./Panels/DashboardPanel";
import RegistrosPanel from "./Panels/RegistersPanel";
import ProductsAdmin from "./Panels/ProductsAdmin";
import InventoryAdmin from "./Panels/InventoryAdmin";
import SuppliersAdmin from "./Panels/SuppliersAdmin";
import UsersAdmin from "./Panels/UsersAdmin";

/* TAB BUTTON */
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`${s.tabBtn} ${active ? s.tabBtnActive : ""}`}
      type="button"
    >
      {children}
    </button>
  );
}

export default function AdminPanel() {
  const [tab, setTab] = useState("dashboard");
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className={s.wrapper}>
      <div className={s.container}>
        <div className={s.header}>
          <h2 className={s.title}>Panel de Administración</h2>
          {user && (
            <div className={s.userInfo}>
              <span>👤 {user.name} ({user.role})</span>

              <button
                className={`${s.btn} ${s.ghost}`}
                onClick={handleLogout}
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

        {/* TABS */}
        <div className={s.tabs}>
          <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")}>📊 Dashboard</TabButton>
          <TabButton active={tab === "registros"} onClick={() => setTab("registros")}>📋 Registros</TabButton>
          <TabButton active={tab === "products"} onClick={() => setTab("products")}>☕ Productos</TabButton>
          <TabButton active={tab === "inventory"} onClick={() => setTab("inventory")}>📦 Inventario</TabButton>
          <TabButton active={tab === "suppliers"} onClick={() => setTab("suppliers")}>🏷️ Proveedores</TabButton>
          <TabButton active={tab === "users"} onClick={() => setTab("users")}>👥 Usuarios</TabButton>
        </div>

        {/* CONTENIDO */}
        <div className={s.section}>
          {tab === "dashboard" && <DashboardPanel />}
          {tab === "registros" && <RegistrosPanel />}
          {tab === "products" && <ProductsAdmin />}
          {tab === "inventory" && <InventoryAdmin />}
          {tab === "suppliers" && <SuppliersAdmin />}
          {tab === "users" && <UsersAdmin />}
        </div>
      </div>
    </div>
  );
}
