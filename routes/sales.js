const express = require('express'); // Importa el módulo express
const router = express.Router(); // Crea un objeto Router
const pool = require('../db'); // Configura tu conexión a PostgreSQL
const axios= require('axios')

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
    const { fecha, subtotal, iva, total, cliente, vendedor } = req.body;
    console.log(fecha,subtotal,iva,total,cliente,vendedor)
    try {
        const newSale = await pool.query(
            'INSERT INTO ventas (fecha, subtotal, iva, total, cliente, vendedor) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [fecha, subtotal, iva, total, cliente, vendedor]
        );
        res.json(newSale.rows[0]);
        console.log('Venta exitosa', newSale.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.error("Error al registrar venta 😢");
    }
});

// Para agregar un nuevo producto
router.post('/sales-products', async (req, res) => {
    const { venta, producto, cantidad, iva, subtotal, total } = req.body;

    console.log('subventaData: ', venta, producto, cantidad, iva, subtotal, total);

    try {
        // Inserción en la tabla subventas
        const newSale = await pool.query(
            'INSERT INTO subventas (id_venta, producto, cantidad, iva, subtotal, total) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [venta, producto, cantidad, iva, subtotal, total]
        );
        console.log('Subventa agregada con éxito', newSale.rows[0]);

        // Reducir el stock del producto
        try {
            const stockResponse = await axios.put(`http://localhost:3000/${producto}/reduce-stock`, { cantidad });
            console.log('Stock actualizado con éxito:', stockResponse.data);
        } catch (error) {
            console.error('Error al reducir el stock:', error.response?.data || error.message);
        }

        // Reducir el inventario global
        try {
            const inventoryResponse = await axios.post(`http://localhost:3000/reduce-inventory`, {
                productoId: producto,
                cantidadVendida: cantidad   
            });
            console.log('Inventario global actualizado con éxito:', inventoryResponse.data);
        } catch (error) {
            console.error('Error al actualizar el inventario:', error.response?.data || error.message);
        }

        // Respuesta al cliente
        res.json(newSale.rows);
    } catch (error) {
        // Error general al insertar la subventa
        console.error("Error al registrar subventa 😢", error);
        res.status(500).json({ error: error.message });
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