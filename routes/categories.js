// RUTA PARA CATEGORIAS DE PRODUCTOS
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener todas las categorías
router.get('/categories', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM public.categorias');
    console.log('Consulta de categorías realizada');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener las categorías:', error);
    res.status(500).json({ message: 'Error al obtener las categorías' });
  } finally {
    client.release();
  }
});

module.exports = router;
