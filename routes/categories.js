const express = require('express'); // Importa el módulo express
const router = express.Router();  // Crea un objeto Router(para manejar las diferentes operaciones del CRUD de productos)
const pool = require('../db'); // Importa el pool de datos de db/index.js


// Rutas para el CRUD de productos

// Obtener todos los productos
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias');
    res.json(result.rows);
    console.log('Consulta de productos realizada');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener los productos 😢');
  }
});

module.exports=router;