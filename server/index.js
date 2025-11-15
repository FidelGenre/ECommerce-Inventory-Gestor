// server/index.js
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();

const pool = require("./db");

// Routers
const authRouter = require("./routes/auth");
const adminRouter = require("./routes/admin");
const userRouter = require("./routes/user");
const ordersRouter = require("./routes/orders");
const payRouter = require("./routes/pay");

const app = express();

/* ================== CONFIG ================== */
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const MP_PUBLIC_BASE_URL = process.env.MP_PUBLIC_BASE_URL || "";

/* ================== MIDDLEWARES ================== */
app.set("trust proxy", 1);

// CORS: tu frontend con credenciales (cookies)
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// evita error de favicon en dev
app.get("/favicon.ico", (_req, res) => res.sendStatus(204));

// Archivos estáticos (imágenes)
app.use("/images", express.static(path.join(__dirname, "public", "images")));

// Helper para armar URL de imagen completa
function withImageURL(item) {
  return {
    ...item,
    image: item.image ? `${BASE_URL}/images/${item.image}` : null,
  };
}

/* ================== ENDPOINTS BÁSICOS ================== */

// Healthcheck
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Catálogo de granos (ejemplo con tu esquema)
app.get("/api/beans", async (_req, res) => {
  try {
    if (!pool) return res.json([]);
    const result = await pool.query(`
      SELECT b.id, b.name, b.description, b.origin, b.roast_level,
             b.price_cents, COALESCE(b.image, 'coffeeall.png') AS image,
             COALESCE(i.stock, 0) AS stock, COALESCE(i.min_stock, 0) AS min_stock
      FROM beanstype b
      LEFT JOIN inventory i ON i.beanstype_id = b.id
      ORDER BY b.id ASC;
    `);
    res.json(result.rows.map(withImageURL));
  } catch (err) {
    console.error("Error en /api/beans:", err);
    res.status(500).json({ error: "Error al obtener beans" });
  }
});

// Alta de grano (admin)
app.post("/api/beans", async (req, res) => {
  const {
    name,
    description,
    origin,
    roast_level,
    price_cents,
    image = "coffeeall.png",
    stock = 0,
    min_stock = 0,
  } = req.body;
  try {
    const inserted = await pool.query(
      `INSERT INTO beanstype (name, description, origin, roast_level, price_cents, image)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, description, origin, roast_level, price_cents, image]
    );
    const bean = inserted.rows[0];

    await pool.query(
      `INSERT INTO inventory (beanstype_id, stock, min_stock)
       VALUES ($1,$2,$3)
       ON CONFLICT (beanstype_id)
       DO UPDATE SET stock=EXCLUDED.stock, min_stock=EXCLUDED.min_stock;`,
      [bean.id, stock, min_stock]
    );

    res.status(201).json(withImageURL({ ...bean, stock, min_stock }));
  } catch (err) {
    console.error("Error agregando bean:", err);
    res.status(500).json({ error: "Error al insertar bean" });
  }
});

/* ================== ROUTERS DE LA APP ================== */
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);
app.use("/api/orders", ordersRouter); // checkout + listados + detalle
app.use("/api/pay", payRouter); // webhook MP

/* ================== 404 & ERROR HANDLERS ================== */
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// (opcional) Handler de errores global
// app.use((err, _req, res, _next) => {
//   console.error("Unhandled error:", err);
//   res.status(500).json({ error: "Internal server error" });
// });

/* ================== START ================== */
app.listen(PORT, async () => {
  console.log(`🚀 API running on ${BASE_URL}`);
  if (MP_PUBLIC_BASE_URL) {
    console.log(`🌐 MP público para pagos: ${MP_PUBLIC_BASE_URL}`);
  }
  try {
    const ping = await pool.query("SELECT NOW()");
    console.log("DB connected:", ping.rows[0]);
  } catch (e) {
    console.error("DB ping error:", e.message);
  }
});
