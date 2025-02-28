const { Pool } = require("pg");
require("dotenv").config(); // Cargar variables de entorno desde .env

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Necesario para conexiones a Supabase
});

pool.connect()
  .then(() => console.log("✅ Conectado a PostgreSQL en Supabase"))
  .catch(err => console.error("❌ Error al conectar a la BD:", err));

module.exports = pool;
