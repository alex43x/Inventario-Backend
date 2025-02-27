//RUTA PARA CLIENTES
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener todos los clientes (con paginación y búsqueda)
router.get('/customers', async (req, res) => {
  const client = await pool.connect();
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT * FROM clientes WHERE 1=1`;
    let values = [];

    if (search) {
      query += ` AND nombre ILIKE $${values.length + 1}`;
      values.push(`%${search}%`);
    }

    if (category) {
      query += ` AND categoria = $${values.length + 1}`;
      values.push(category);
    }

    query += ` ORDER BY id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await client.query(query, values);
    console.log('Consulta de clientes realizada');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener los clientes:', error);
    res.status(500).json({ message: 'Error al obtener los clientes' });
  } finally {
    client.release();
  }
});

// Obtener un cliente por ID
router.get('/customers/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    console.log("Consulta de cliente:", id);

    const result = await client.query('SELECT * FROM clientes WHERE id=$1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Cliente no encontrado' });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener el cliente:', error);
    res.status(500).json({ message: 'Error al obtener el cliente' });
  } finally {
    client.release();
  }
});

// Crear un nuevo cliente
router.post('/customers', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id, nombre, saldo } = req.body;
    console.log('Solicitud para agregar cliente:', req.body);

    const newCustomer = await client.query(
      'INSERT INTO clientes (id, nombre, saldo) VALUES ($1, $2, $3) RETURNING *',
      [id, nombre, saldo]
    );
    console.log('Cliente agregado con éxito:', newCustomer.rows[0]);
    res.json(newCustomer.rows[0]);
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ error: 'Error al crear cliente' });
  } finally {
    client.release();
  }
});

// Actualizar cliente (nombre y saldo)
router.put('/customers/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { nombre, saldo } = req.body;
    console.log('Actualización de cliente:', id);

    const result = await client.query(
      'UPDATE clientes SET saldo=$1, nombre=$2 WHERE id=$3 RETURNING *',
      [saldo, nombre, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Cliente no encontrado' });

    console.log('Cliente actualizado:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  } finally {
    client.release();
  }
});

// Actualizar saldo del cliente tras una venta a crédito
router.put('/customers-sale/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { saldo } = req.body;
    console.log('Cambio de saldo por venta para cliente:', id);

    const result = await client.query(
      'UPDATE clientes SET saldo = saldo + $1 WHERE id=$2 RETURNING *',
      [saldo, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Cliente no encontrado' });

    console.log('Saldo actualizado:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar saldo por venta:', error);
    res.status(500).json({ error: 'Error al actualizar saldo' });
  } finally {
    client.release();
  }
});

module.exports = router;
