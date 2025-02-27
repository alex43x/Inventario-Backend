//RUTA PARA PRODUCTOS
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener todos los productos
router.get('/products', async (req, res) => {
  const client = await pool.connect();
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

    const result = await client.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener los productos 😢');
  } finally {
    client.release(); // ✅ Libera la conexión
  }
});

// Obtener producto por ID
router.get('/products/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const result = await client.query(`SELECT * FROM productos WHERE id_prod=$1`, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener el producto 😢');
  } finally {
    client.release();
  }
});

//Para obtener productos con falta de unidades
router.get('/products-alerts', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `SELECT nombre as elemento, stock as cantidad, alerta as total 
       FROM productos 
       WHERE alerta >= stock 
       ORDER BY stock ASC 
       LIMIT 20`
    );
    res.json(result.rows);
    console.log('Consulta de productos en alerta realizada');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener los productos 😢');
  } finally {
    if (client) client.release();
  }
});

//Para buscar productos
router.get('/search/products', async (req, res) => {
  const { nombre } = req.query;
  if (!nombre) {
    return res.status(400).json({ error: "El término de búsqueda es obligatorio" });
  }
  const limit = 20; // Limitar a 20 resultados por defecto
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `SELECT * FROM productos WHERE nombre ILIKE $1 AND stock > 0 LIMIT $2`,
      [`%${nombre}%`, limit] // Búsqueda que ignora mayúsculas/minúsculas
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al buscar productos" });
  } finally {
    if (client) client.release();
  }
});


// Agregar producto
router.post('/products', async (req, res) => {
  const client = await pool.connect();
  try {
    const { nombre, descrip, stock, precio, iva, categoria, alerta } = req.body;
    const newProduct = await client.query(
      'INSERT INTO productos (nombre, descrip, stock, precio, iva, categoria, alerta) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [nombre, descrip, stock, precio, iva, categoria, alerta]
    );
    res.json(newProduct.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Actualizar stock luego de agregar un lote
router.post('/products/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { cant } = req.body;
    console.log('Actualizando stock. ID:', id, 'Cantidad:', cant);
    await client.query(`UPDATE productos SET stock = stock + $1 WHERE id_prod = $2`, [cant, id]);
    res.json({ message: 'Stock actualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar el stock' });
  } finally {
    client.release();
  }
});

// Eliminar producto
router.delete('/products/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    console.log('Eliminando producto con ID:', id);
    await client.query('DELETE FROM productos WHERE id_prod = $1', [id]);
    res.json({ message: 'Producto eliminado con éxito' });
  } catch (err) {
    res.status(500).send('Error al eliminar el producto 😢');
  } finally {
    client.release();
  }
});

// Actualizar producto
router.put('/products-edit/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { nombre, descrip, stock, iva, categoria, precio } = req.body;
    const updatedProduct = await client.query(
      'UPDATE productos SET nombre = $2, descrip = $3, stock = $4, iva = $5, categoria = $6, precio = $7 WHERE id_prod = $1 RETURNING *',
      [id, nombre, descrip, stock, iva, categoria, precio]
    );
    if (updatedProduct.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(updatedProduct.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Reducir stock por venta
router.put('/:id/reduce-stock', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { cantidad } = req.body;
    console.log('Reduciendo stock...');
    const reduceStock = await client.query(
      'UPDATE productos SET stock = stock - $1 WHERE id_prod = $2 RETURNING *',
      [cantidad, id]
    );
    res.json(reduceStock.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
