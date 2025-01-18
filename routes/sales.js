const express = require('express'); // Importa el módulo express
const router = express.Router(); // Crea un objeto Router
const pool = require('../db'); // Configura tu conexión a PostgreSQL

router.get('/sales', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ventas');
        res.json(result.rows);
        console.log('Consulta de ventas realizada')
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener las ventas 😢');
    }
});


router.get('/sales/:id', async (req, res) => {
    const { id } = req.params
    try {
        const result = await pool.query(`SELECT * FROM ventas WHERE id = $1`, [id]);
        res.json(result.rows);
        console.log('Consulta de ventas realizada');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener los ventas 😢');
    }
});

// Para agregar un nuevo producto
router.post('/sales', async (req, res) => {
    const { fecha, subototal, iva, total, cliente, vendedor } = req.body;
    try {
        const newSale = await pool.query(
            'INSERT INTO productos (fecha, subototal, iva, total, cliente, vendedor) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [fecha, subototal, iva, total, cliente, vendedor]
        );
        res.json(newSale.rows[0]);
        console.log('Producto agregado con éxito', newSale.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.error("Error al crear un producto 😢");
    }
});

//Para eliminar un producto
router.delete('/sales/:id', async (req, res) => {
    const { id } = req.params;
    console.log('Solicitud para eliminar venta de id: ', id);
    try {
        const result = await pool.query('DELETE FROM ventas WHERE id = $1', [id]);
        res.json(result.rows);
        console.log('Producto eliminado con éxito');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al eliminar un producto 😢');
        console.log('Error al eliminar un producto');
    }
});

module.exports = router;