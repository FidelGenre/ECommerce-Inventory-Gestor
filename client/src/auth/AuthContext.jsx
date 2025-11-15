import { createContext, useContext, useEffect, useState } from "react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function fetchJSON(
  path,
  { method = "GET", body, headers = {}, credentials = "include" } = {}
) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { user } = await fetchJSON("/auth/me");
      setUser(user);
      return user;
    } catch {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    const { user } = await fetchJSON("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setUser(user);
    return user; 
  };

  const register = async (name, email, password) => {
    const { user } = await fetchJSON("/auth/register", {
      method: "POST",
      body: { name, email, password },
    });
    setUser(user);
    return user; 
  };

  const logout = async () => {
    await fetchJSON("/auth/logout", { method: "POST" });
    setUser(null);
    return true;
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
