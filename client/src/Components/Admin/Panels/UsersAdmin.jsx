import { useEffect, useState } from "react";
import { fetchJSON } from "../../../lib/http";
import s from "../AdminPanel.module.css";

/* ===================== Usuarios ===================== */

export default function UsersAdmin() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const data = await fetchJSON("/admin/users");
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || "Error cargando usuarios");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setRole = async (id, role) => {
    try {
      await fetchJSON(`/admin/users/${id}`, {
        method: "PUT",
        body: { role },
      });
      await load();
    } catch (e) {
      setErr(e.message || "Error cambiando rol");
    }
  };

  const remove = async (id) => {
    if (!confirm("¿Eliminar usuario?")) return;

    try {
      await fetchJSON(`/admin/users/${id}`, {
        method: "DELETE",
      });
      await load();
    } catch (e) {
      setErr(e.message || "Error eliminando usuario");
    }
  };

  return (
    <div className={s.section}>
      <h3 className={s.h3}>Usuarios</h3>
      {err && <p className={s.error}>{err}</p>}

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead className={s.theadSticky}>
            <tr>
              <th className={s.cId}>#</th>
              <th className={s.cName}>Nombre</th>
              <th className={s.cName}>Email</th>
              <th className={s.cVis}>Rol</th>
              <th className={s.cAct}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {list.map((u, i) => (
              <tr key={u.id} className={s.tr}>
                <td className={s.td}>{i + 1}</td>

                <td className={s.td}>
                  <span className={s.ellipsis}>{u.name}</span>
                </td>

                <td className={s.td}>
                  <span className={s.ellipsis}>{u.email}</span>
                </td>

                <td className={s.td}>{u.role}</td>

                <td className={s.td}>
                  <button
                    className={s.btn}
                    onClick={() =>
                      setRole(
                        u.id,
                        u.role === "admin" ? "client" : "admin"
                      )
                    }
                  >
                    set {u.role === "admin" ? "client" : "admin"}
                  </button>

                  <button
                    className={`${s.btn} ${s.danger}`}
                    onClick={() => remove(u.id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}

            {list.length === 0 && (
              <tr>
                <td className={s.td} colSpan={5} style={{ textAlign: "center" }}>
                  No hay usuarios aún.
                </td>
              </tr>
            )}
          </tbody>

        </table>
      </div>
    </div>
  );
}
