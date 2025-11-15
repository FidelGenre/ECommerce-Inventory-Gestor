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
const IS_PROD = process.env.NODE_ENV === "production";

// Render autogenera BASE_URL si está vacío
const BASE_URL =
  process.env.BASE_URL || (IS_PROD ? "" : `http://localhost:${PORT}`);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const MP_PUBLIC_BASE_URL = process.env.MP_PUBLIC_BASE_URL || "";

/* ================== TRUST PROXY ================== */
app.set("trust proxy", 1);

/* ================== CORS (COMPATIBLE SAFARI IOS) ================== */
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        FRONTEND_URL,
        "http://localhost:5173",
        "https://ecommerceclient-w2q7.onrender.com",
      ];

      // Safari iOS puede mandar origin null
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ CORS blocked:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Necesario para preflight en celulares
app.options("*", cors());

/* ================== MIDDLEWARES ================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/favicon.ico", (_req, res) => res.sendStatus(204));

/* ================== ARCHIVOS ESTÁTICOS ================== */
app.use("/images", express.static(path.join(__dirname, "public", "images")));

/* Helper para URLs de imágenes */
function withImageURL(item) {
  const base = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  return {
    ...item,
    image: item.image ? `${base}/images/${item.image}` : null,
  };
}

/* ================== ENDPOINTS PÚBLICOS ================== */

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/beans", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.id,
        b.name,
        b.description,
        b.origin,
        b.roast_level,
        b.price_cents,
        COALESCE(b.image, 'coffeeall.png') AS image,
        COALESCE(i.stock, 0) AS stock,
        COALESCE(i.min_stock, 0) AS min_stock
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

/* ================== ENDPOINTS ADMIN ================== */

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

/* ================== ROUTERS ================== */

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/pay", payRouter);

/* ================== 404 ================== */
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

/* ================== START ================== */
app.listen(PORT, async () => {
  console.log(`🚀 API running on ${BASE_URL || "(Render autogen)"}`);

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
