const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '.env'); // Ajusta la ruta del .env si es necesario
dotenv.config({ path: envPath });

console.log(`📄 Cargando variables desde: ${envPath}`);
console.log("📌 DB_HOST:", process.env.DB_HOST);
console.log("📌 DB_USER:", process.env.DB_USER);
console.log("📌 DB_NAME:", process.env.DB_NAME);
console.log("📌 DB_PORT:", process.env.DB_PORT);

const pool = new Pool({
    host: process.env.DB_HOST, // Datos desde .env
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    max: 20, // Máximo de conexiones en el pool
    idleTimeoutMillis: 30000, // Tiempo antes de cerrar conexiones inactivas
    connectionTimeoutMillis: 2000, // Timeout al conectar
});

pool.on('error', (err) => {
    console.error('⚠️ Error en la conexión de PostgreSQL:', err);
});

process.on('SIGINT', async () => {
    console.log("\n🛑 Cerrando pool de conexiones...");
    await pool.end();
    console.log("✅ Conexiones cerradas.");
    process.exit(0);
});

module.exports = pool;
