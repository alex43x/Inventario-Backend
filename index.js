const express = require('express');
const app = express();
const cors = require('cors');

//const bcrypt = require('bcrypt'); //para encriptar la contraseña no implementado
//const jwt = require('jsonwebtoken');

const productsRoutes = require('./routes/products');
const loginRoutes = require('./routes/login');
const inventoryRoutes = require('./routes/inventory');
const categoriesRoutes=require('./routes/categories')

app.use(cors());
app.use(express.json());

app.use(productsRoutes);
app.use(loginRoutes);
app.use(inventoryRoutes);
app.use(categoriesRoutes);

const port = 3000;
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
