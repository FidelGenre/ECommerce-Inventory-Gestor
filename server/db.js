// db.js (CommonJS)
const { Pool } = require("pg");
require("dotenv").config();

let pool = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });
} else {
  console.warn("No DATABASE_URL: sin conexión a DB.");
}
module.exports = pool;
