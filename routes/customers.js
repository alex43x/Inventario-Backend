const express = require('express'); // Importa el módulo express
const router = express.Router(); // Crea un objeto Router
const pool = require('../db'); // Configura tu conexión a PostgreSQL

router.get('/customers', async (req, res) => {
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

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener los productos 😢');
  }
});

router.get('/customers/:id', async (req, res) => {
  const { id } = req.params
  console.log("Consulta de cliente: ",id)
  try {
    const result = await pool.query('SELECT * FROM clientes where id=$1', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener los usuarios 😢');
  }
});

router.post('/customers', async (req, res) => {
  const { id, nombre, saldo } = req.body;
  console.log(req.body)
  try {
    const newCustomer = await pool.query(
      'INSERT INTO clientes (id, nombre, saldo) VALUES ($1, $2, $3) RETURNING *',
      [id, nombre, saldo]
    );
    res.json(newCustomer.rows);
    console.log('Cliente agregado con éxito');
    console.table(newCustomer.rows)
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.error("Error al crear cliente 😢");
  }
});

router.put('/customers/:id', async (req, res) => {
  const { id } = req.params
  const { nombre, saldo } = req.body
  try {
    console.log('Cambio de saldo por venta...')
    const result = await pool.query(`UPDATE clientes set saldo=$1, nombre=$2 where id=$3 returning *`, [saldo, nombre, id])
    console.table(result.rows)
    res.json(result.rows)
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message })
  }
})

router.put('/customers-sale/:id', async (req, res) => {
  const { id } = req.params
  const { saldo } = req.body
  try {
    const result = await pool.query(`UPDATE clientes set saldo=saldo+$1 where id=$2 returning *`, [saldo, id])
    console.log('Cambio de saldo por venta...')
    console.table(result.rows)
    res.json(result.rows)
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message })
  }
})

module.exports = router;
