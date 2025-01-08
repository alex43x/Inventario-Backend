const express = require('express'); // Importa el módulo express
const router = express.Router();  // Crea un objeto Router(para manejar las diferentes operaciones del CRUD de productos)
const pool = require('../db'); // Importa el pool de datos de db/index.js


// Rutas para el CRUD de productos

// Obtener todos los productos
router.get('/products', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM productos'); 
      res.json(result.rows);
      console.log('Consulta de productos realizada');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error al obtener los productos 😢');
    }
});

// Para agregar un nuevo producto
router.post('/products', async (req, res) => {
  const { nombre, descrip, stock} = req.body;
  try {
    const newProduct = await pool.query(
      'INSERT INTO productos (nombre, descrip, stock) VALUES ($1, $2, $3) RETURNING *',
      [nombre, descrip, stock]
    );
    res.json(newProduct.rows[0]);
    console.log('Producto agregado con éxito', newProduct.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.error("Error al crear un producto 😢");
  }
});

//Para eliminar un producto
router.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  console.log('Solicitud para eliminar producto de id: ', id);  
  try {
    const result = await pool.query('DELETE FROM productos WHERE id_prod = $1', [id]);
    res.json(result.rows);
    console.log('Producto eliminado con éxito');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al eliminar un producto 😢');
    console.log('Error al eliminar un producto');
  }
});

// Para actualizar un producto
router.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descrip, stock } = req.body;
  try {
    const updatedProduct = await pool.query(
      'UPDATE productos SET nombre = $1, descrip = $2, stock= $3 WHERE id_prod = $4 RETURNING *',
      [nombre, descrip, stock, id]
    );
    if (updatedProduct.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(updatedProduct.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Exportar el router (se importará en index.js)
module.exports = router;
