const express = require("express");
const cors = require("cors");
const pool = require("./db"); // Importa el pool de conexión

const app = express();

const productsRoutes = require("./routes/products");
const loginRoutes = require("./routes/login");
const inventoryRoutes = require("./routes/inventory");
const categoriesRoutes = require("./routes/categories");
const customersRoutes = require("./routes/customers");
const salesRoutes = require("./routes/sales");
const paymentsRoutes = require("./routes/payments");
const reportsRoutes = require("./routes/reports");

app.use(cors({ origin: "*" }));
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

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("🚀 Backend desplegado en Vercel correctamente.");
});

// Exporta app para Vercel
module.exports = app;
