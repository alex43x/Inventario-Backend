const express = require('express');
const router = express.Router();
const pool = require('../db'); // Configura tu conexión a PostgreSQL


// Rutas para el CRUD de productos
router.get('/products', async (req, res) => {
    try {
        console.log("here")
      const result = await pool.query('SELECT * FROM productos'); 
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error al obtener los productos 😢');
    }
});

router.post('/products', async (req, res) => {
  const { nombre, descrip, stock} = req.body;
  console.log(nombre, descrip, stock);
  try {
    console.log("here");
    const newProduct = await pool.query(
      'INSERT INTO productos (nombre, descrip, stock) VALUES ($1, $2, $3) RETURNING *',
      [nombre, descrip, stock]
    );
    res.json(newProduct.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.error("Error al crear un producto 😢");
  }
});

// Exportar el router
module.exports = router;
