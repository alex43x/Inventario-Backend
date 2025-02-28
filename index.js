const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Importa el pool de datos

const app = express();

const productsRoutes = require('./routes/products');
const loginRoutes = require('./routes/login');
const inventoryRoutes = require('./routes/inventory');
const categoriesRoutes = require('./routes/categories');
const customersRoutes = require('./routes/customers');
const salesRoutes = require('./routes/sales');
const paymentsRoutes = require('./routes/payments');
const reportsRoutes = require('./routes/reports');

app.use(cors({ origin: '*' }));
app.use(express.json());

// Rutas
app.use(productsRoutes);
app.use(loginRoutes);
app.use(inventoryRoutes);
app.use(categoriesRoutes);
app.use(customersRoutes);
app.use(salesRoutes);
app.use(paymentsRoutes);
app.use(reportsRoutes);

const port = 3000;
const server = app.listen(port, () => {
    console.log(` Servidor corriendo en http://localhost:${port}`);
    console.log(" Conectando a PostgreSQL con:", process.env.DB_HOST, process.env.DB_USER);
});

// Manejar errores del servidor
server.on("error", (err) => {
    console.error("❌ Error en el servidor:", err);
});

// Cerrar conexiones al apagar el servidor
process.on("SIGINT", async () => {
    console.log("\n🛑 Apagando servidor...");
    await pool.end();
    server.close(() => {
        console.log("✅ Servidor apagado.");
        process.exit(0);
    });
});
