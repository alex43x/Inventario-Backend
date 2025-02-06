const express = require('express'); // Importa el módulo express
const router = express.Router();  // Crea un objeto Router(para manejar las diferentes operaciones del CRUD de productos)
const pool = require('../db'); // Importa el pool de datos de db/index.js


// Rutas para el CRUD de productos

// Obtener todos los productos
router.get('/products', async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;  

    let query = `SELECT * FROM productos WHERE 1=1`;
    let values = [];

    if (search) {
      query += ` AND nombre ILIKE $${values.length + 1}`;
      values.push(`%${search}%`);
    }

    if (category) {
      query += ` AND categoria = $${values.length + 1}`;
      values.push(category);
    }

    query += ` ORDER BY id_prod LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener los productos 😢');
  }
});

router.get('/products/:id', async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query(`SELECT * FROM productos WHERE id_prod=$1`, [id]);
    res.json(result.rows);
    console.log('Consulta de producto específico realizada');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener los productos 😢');
  }
});

router.get('/search/products', async (req, res) => {
  const { nombre } = req.query;
  if (!nombre) {
    return res.status(400).json({ error: "El término de búsqueda es obligatorio" });
  }
  const limit = 5; // Limitar a 5 resultados por defecto
  try {
    const result = await pool.query(
      `SELECT * FROM productos WHERE nombre ILIKE $1 AND stock > 0 LIMIT $2`,
      [`%${nombre}%`, limit] // Búsqueda que ignora mayúsculas/minúsculas
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al buscar productos" });
  }
});

// Para agregar un nuevo producto
router.post('/products', async (req, res) => {
  const { nombre, descrip, stock, precio, iva, categoria } = req.body;
  try {
    const newProduct = await pool.query(
      'INSERT INTO productos (nombre, descrip, stock, precio, iva, categoria) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nombre, descrip, stock, precio, iva, categoria]
    );
    res.json(newProduct.rows[0]);
    console.log('Producto agregado con éxito', newProduct.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.error("Error al crear un producto 😢");
  }
});
//Módulo para actualizar el stock del producto en general
router.post('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { cant } = req.body;
  console.log('Solicitud para actualizar stock. ID: ', id,', cantidad: ', cant)
  try {
    const result = await pool.query(`UPDATE productos SET stock = stock + $1 WHERE id_prod = $2; `, [cant, id]);
    console.log('Stock actualizado');
  } catch (err) {
    res.status(500).json('Error al actualizar el stock');
    console.log('Error al actualizar el stock')
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
router.put('/products-edit/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descrip, stock, iva, categoria, precio } = req.body;
  try {
    const updatedProduct = await pool.query(
      'UPDATE productos SET nombre = $2, descrip = $3, stock = $4, iva = $5, categoria = $6, precio = $7 WHERE id_prod = $1 RETURNING *',
      [id, nombre, descrip, stock, iva, categoria, precio]
    );
    if (updatedProduct.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(updatedProduct.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/reduce-stock', async (req, res) => {
  const { id } = req.params;
  const { cantidad } = req.body;
  console.log('Reducción de stock general...')
  try {
    const reduceStock = await pool.query(
      'UPDATE productos SET stock = stock - $1 WHERE id_prod = $2 RETURNING * ',
      [cantidad, id]
    );
    res.json(reduceStock.rows[0]);
    console.table(reduceStock.rows)
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
});

// Exportar el router (se importará en index.js)
module.exports = router;
