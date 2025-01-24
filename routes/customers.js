const express = require('express'); // Importa el módulo express
const router = express.Router(); // Crea un objeto Router
const pool = require('../db'); // Configura tu conexión a PostgreSQL

router.get('/customers', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM clientes'); 
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error al obtener los usuarios 😢');
    }
  });

module.exports=router;
  