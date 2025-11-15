// client/src/App.jsx
import React, { useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Header from "./Components/Header/Header";
import Footer from "./Components/Footer/Footer";
import Home from "./Components/Home/Home";
import About from "./Components/About/About";
import Menu from "./Components/Menu/Menu";
import Contact from "./Components/Contact/Contact";
import { CartProvider } from "./Components/Cart/CartContext";
import Cart from "./Components/Cart/Cart";
import Login from "./auth/Login";
import Register from "./auth/Register";
import AdminPanel from "./Components/Admin/AdminPanel";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { useAuth } from "./auth/AuthContext";
import UserPanel from "./Components/User/UserPanel";

// ⬇⬇⬇ NUEVO IMPORT
import FloatingCartButton from "./Components/Cart/FloatingCartButton";

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";

  const hideChrome =
    isAuthPage ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/user");

  const showBackBar = hideChrome;

  return (
    <CartProvider>
      {!hideChrome && <Header onCartClick={() => setIsCartOpen(true)} />}

      {showBackBar && (
        <div
          style={{
            padding: "30px 30px",
            backgroundColor: "#745131",
            color: "#f5e6d3",
            cursor: "pointer",
            fontSize: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontFamily: "sans-serif",
          }}
          onClick={() => navigate("/")}
        >
          🡐 Volver al Inicio
        </div>
      )}

      <Routes>
        <Route
          path="/"
          element={
            <>
              <section id="home">
                <Home />
              </section>
              <section id="about">
                <About />
              </section>
              <section id="menu">
                <Menu />
              </section>
              <section id="contact">
                <Contact />
              </section>

              {/* BOTÓN FLOTANTE 🛒 */}
              <FloatingCartButton onClick={() => setIsCartOpen(true)} />

              <Footer />
              <Cart
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
              />
            </>
          }
        />

        {/* Auth pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Panel de Usuario */}
        <Route
          path="/user"
          element={
            <ProtectedRoute roles={["client", "admin"]}>
              <UserPanel />
            </ProtectedRoute>
          }
        />

        {/* Admin Panel protegido */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
      </Routes>
    </CartProvider>
  );
}

export default App;
