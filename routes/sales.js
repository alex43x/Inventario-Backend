const express = require('express'); // Importa el módulo express
const router = express.Router(); // Crea un objeto Router
const pool = require('../db'); // Configura tu conexión a PostgreSQL
const axios = require('axios')

router.get('/sales', async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT ventas.id, ventas.total, ventas.fecha, 
                   clientes.nombre AS cliente, users.username AS vendedor
            FROM ventas
            JOIN clientes ON ventas.cliente = clientes.id
            JOIN users ON ventas.vendedor = users.id_user
            WHERE 1=1
        `;
        let values = [];

        if (search) {
            query += ` AND (clientes.nombre ILIKE $${values.length + 1} OR users.username ILIKE $${values.length + 1})`;
            values.push(`%${search}%`);
        }

        query += ` ORDER BY ventas.fecha DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
        values.push(limit, offset);

        const result = await pool.query(query, values);
        res.json(result.rows);

        console.log('Consulta de ventas realizada');
        console.table(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener las ventas 😢');
    }
});


router.get('/sales-dashboard', async (req, res) => {
    try {
        const daily = await pool.query('select date(fecha) as inicio, sum(total) as total from ventas where fecha::date=current_date group by inicio;');
        const weekly = await pool.query("SELECT DATE_TRUNC('week', fecha) AS inicio, SUM(total) AS total FROM ventas WHERE DATE_TRUNC('week', fecha) = DATE_TRUNC('week', CURRENT_DATE) GROUP BY inicio;");
        const monthly = await pool.query("SELECT DATE_TRUNC('month', fecha) AS inicio, SUM(total) AS total FROM ventas WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE) GROUP BY inicio;");
        const data = [daily.rows[0], weekly.rows[0], monthly.rows[0]]

        res.json(data);
        console.log('Consulta de ventas realizada')
        console.table(data)
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener las ventas 😢');
    }
});

router.get('/sales-graph', async (req, res) => {
    try {
        const result = await pool.query("SELECT fechas.dia, TO_CHAR(fechas.dia, 'DD Mon') AS dia_formateado, COALESCE(SUM(v.total), 0) AS total_dia FROM (SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day')::DATE AS dia) AS fechas LEFT JOIN ventas v ON DATE(v.fecha) = fechas.dia GROUP BY fechas.dia ORDER BY fechas.dia;");
        res.json(result.rows);
        console.log('Consulta de ventas realizada')
        console.table(result.rows)
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener las ventas 😢');
    }
});


router.get('/sales/:id', async (req, res) => {
    const { id } = req.params
    try {
        const result = await pool.query(`SELECT id, fecha, total, cliente, vendedor FROM ventas WHERE id = $1 and estado = true`, [id]);
        res.json(result.rows);
        console.log('Consulta de ventas realizada');
        console.table(result.rows)
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener los ventas 😢');
    }
});

router.get('/sub-sales-by/:id', async (req, res) => {
    const { id } = req.params;
    console.log('Solicitud para obtener subventas de venta de ID: ', id);
    try {
        const subsales = await pool.query(`Select subventas.cantidad, subventas.total, productos.nombre as producto from subventas join productos on subventas.producto=productos.id_prod where id_venta = $1 and estado = true`, [id]);
        res.json(subsales.rows);
        console.table(subsales.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener subventas');
    }
});

router.get('/sub-sales-product/:id', async (req, res) => {
    const { id } = req.params;
    console.log('Solicitud para obtener subventas de producto de ID: ', id);
    try {
        const subsales = await pool.query(
            `SELECT clientes.nombre as elemento, 
                    subventas.cantidad as cantidad, 
                    TO_CHAR(ventas.fecha, 'YYYY-MM-DD HH24:MI:SS') as total 
             FROM subventas 
             JOIN ventas ON subventas.id_venta = ventas.id 
             JOIN clientes ON ventas.cliente = clientes.id 
             WHERE ventas.estado != 'anulado' 
             AND subventas.producto = $1;`, 
            [id]
        );

        res.json(subsales.rows);
        console.table(subsales.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener subventas');
    }
});


// Para agregar venta
router.post('/sales', async (req, res) => {
    const { fecha, subtotal, iva, total, cliente, vendedor, contado, estado } = req.body;
    console.log('Solicitud de registro de venta en proceso...')
    try {
        const newSale = await pool.query(
            'INSERT INTO ventas (fecha, subtotal, iva, total, cliente, vendedor, contado, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [fecha, subtotal, iva, total, cliente, vendedor, contado, estado]
        );
        res.json(newSale.rows[0]);
        console.log('Venta exitosa:');
        console.table(newSale.rows)
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.error("Error al registrar venta 😢");
    }
});

// Para agregar un nuevo producto
router.post('/sales-products', async (req, res) => {
    const { venta, producto, cantidad, iva, subtotal, total } = req.body;

    console.log('Solicitud de subventa para venta de ID: ', venta);

    try {
        // Inserción en la tabla subventas
        const newSale = await pool.query(
            'INSERT INTO subventas (id_venta, producto, cantidad, iva, subtotal, total) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [venta, producto, cantidad, iva, subtotal, total]
        );
        console.log('Subventa agregada con éxito');
        console.table(newSale.rows)
        // Reducir el stock del producto
        try {
            const stockResponse = await axios.put(`http://localhost:3000/${producto}/reduce-stock`, { cantidad });
            console.log('Stock actualizado con éxito:');
            console.table(stockResponse.data)
        } catch (error) {
            console.error('Error al reducir el stock:', error.response?.data || error.message);
        }

        // Reducir el inventario global
        try {
            const inventoryResponse = await axios.post(`http://localhost:3000/reduce-inventory`, {
                productoId: producto,
                cantidadVendida: cantidad
            });
            console.log('Inventario actualizado con éxito:', inventoryResponse.data);
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
        console.log('Error al eliminar un producto');
        console.error(err);
        res.status(500).send('Error al eliminar un producto 😢');
    }
});



module.exports = router;