//RUTA PARA VENTAS
const express = require('express');
const router = express.Router();
const pool = require('../db');
const axios = require('axios');

//Para obtener las ventas
router.get('/sales', async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        let query = `
            SELECT ventas.id, ventas.total, ventas.fecha, ventas.estado,
                   clientes.nombre AS cliente, users.username AS vendedor
            FROM ventas
            JOIN clientes ON ventas.cliente = clientes.id
            JOIN users ON ventas.vendedor = users.id_user
            WHERE 1=1`;
        let values = [];

        if (search) {
            query += ` AND (clientes.nombre ILIKE $${values.length + 1} OR users.username ILIKE $${values.length + 1})`;
            values.push(`%${search}%`);
        }

        query += ` ORDER BY ventas.fecha DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
        values.push(limit, offset);

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener las ventas 😢');
    }
});

//Para obtener ventas durante el ultimo mes, semana y dia
router.get('/sales-dashboard', async (req, res) => {
    try {
        const client = await pool.connect();
        const daily = await client.query("SELECT date(fecha) AS inicio, SUM(total) AS total FROM ventas WHERE fecha::date = CURRENT_DATE GROUP BY inicio;");
        const weekly = await client.query("SELECT DATE_TRUNC('week', fecha) AS inicio, SUM(total) AS total FROM ventas WHERE DATE_TRUNC('week', fecha) = DATE_TRUNC('week', CURRENT_DATE) GROUP BY inicio;");
        const monthly = await client.query("SELECT DATE_TRUNC('month', fecha) AS inicio, SUM(total) AS total FROM ventas WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE) GROUP BY inicio;");
        client.release();
        res.json([daily.rows[0], weekly.rows[0], monthly.rows[0]]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener las ventas 😢');
    }
});

//Para el grafico de ventas en la semana
router.get('/sales-graph', async (req, res) => {
    let client;

    try {
        client = await pool.connect();
        const query = `
            SELECT 
                fechas.dia, 
                TO_CHAR(fechas.dia, 'DD Mon') AS dia_formateado, 
                COALESCE(SUM(v.total), 0) AS total_dia 
            FROM 
                (SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day')::DATE AS dia) AS fechas 
            LEFT JOIN ventas v 
                ON DATE(v.fecha) = fechas.dia 
            GROUP BY fechas.dia 
            ORDER BY fechas.dia;
        `;

        const result = await client.query(query);
        res.json(result.rows);

        console.log('Consulta de ventas realizada');
        console.table(result.rows);
    } catch (err) {
        console.error('Error al obtener las ventas 😢', err);
        res.status(500).send('Error al obtener las ventas 😢');
    } finally {
        if (client) client.release();
    }
});

//Para obtener ventas por id
router.get('/sales/:id', async (req, res) => {
    try {
        const result = await pool.query("SELECT id, fecha, total, cliente, vendedor FROM ventas WHERE id = $1 AND estado = true", [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener la venta 😢');
    }
});

//Para obtener las subventas de una venta por id
router.get('/sub-sales-by/:id', async (req, res) => {
    const { id } = req.params;
    console.log('Solicitud para obtener subventas de venta de ID:', id);
    let client;

    try {
        client = await pool.connect();
        const query = `
            SELECT 
                subventas.cantidad, 
                subventas.total, 
                productos.nombre AS producto 
            FROM 
                subventas 
            JOIN 
                productos ON subventas.producto = productos.id_prod 
            WHERE 
                id_venta = $1 AND estado = true;
        `;

        const subsales = await client.query(query, [id]);
        res.json(subsales.rows);

        console.table(subsales.rows);
    } catch (error) {
        console.error('Error al obtener subventas', error);
        res.status(500).send('Error al obtener subventas');
    } finally {
        if (client) client.release();
    }
});

//Para obtener las últimas ventas de un producto
router.get('/sub-sales-product/:id', async (req, res) => {
    const { id } = req.params;
    console.log('Solicitud para obtener subventas de producto de ID:', id);
    let client;

    try {
        client = await pool.connect();
        const query = `
            SELECT 
                clientes.nombre AS elemento, 
                subventas.cantidad AS cantidad, 
                TO_CHAR(ventas.fecha, 'YYYY-MM-DD HH24:MI:SS') AS total 
            FROM 
                subventas 
            JOIN 
                ventas ON subventas.id_venta = ventas.id 
            JOIN 
                clientes ON ventas.cliente = clientes.id 
            WHERE 
                ventas.estado != 'anulado' 
                AND subventas.producto = $1;
        `;

        const subsales = await client.query(query, [id]);
        res.json(subsales.rows);
        console.table(subsales.rows);
    } catch (error) {
        console.error('Error al obtener subventas', error);
        res.status(500).send('Error al obtener subventas');
    } finally {
        if (client) client.release();
    }
});

//Para registrar una venta
router.post('/sales', async (req, res) => {
    let client= await pool.connect();
    try {
        const { fecha, subtotal, iva, total, cliente, vendedor, contado, estado } = req.body;
        const result = await client.query(
            "INSERT INTO ventas (fecha, subtotal, iva, total, cliente, vendedor, contado, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
            [fecha, subtotal, iva, total, cliente, vendedor, contado, estado]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }finally{
        if(client)client.release();
    }
});

//Registro de subventas
router.post('/sales-products', async (req, res) => {
    const { venta, producto, cantidad, iva, subtotal, total } = req.body;
    console.log('Solicitud de subventa para venta de ID:', venta);
    let client;

    try {
        client = await pool.connect();

        // Inserción en la tabla subventas
        const newSale = await client.query(
            'INSERT INTO subventas (id_venta, producto, cantidad, iva, subtotal, total) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [venta, producto, cantidad, iva, subtotal, total]
        );

        console.log('Subventa agregada con éxito');
        console.table(newSale.rows);

        // Reducir el stock del producto
        try {
            const stockResponse = await axios.put(`http://localhost:3000/${producto}/reduce-stock`, { cantidad });
            console.log('Stock actualizado con éxito:');
            console.table(stockResponse.data);
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
        console.error('Error al registrar subventa 😢', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (client) client.release();
    }
});

//Para anular ventas
router.post('/sales-cancel', async (req, res) => {
    const { saleId } = req.body; // Se espera recibir { saleId: <ID de la venta> }
    let client;
    console.log(req.body)

    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // 1. Actualizar la venta a "anulado"
        const saleResult = await client.query(
            "UPDATE ventas SET estado = 'anulado' WHERE id = $1 RETURNING *",
            [saleId]
        );
        if (saleResult.rows.length === 0) {
            throw new Error('Venta no encontrada');
        }
        const sale = saleResult.rows[0];

        // 2. Obtener todas las subventas asociadas a la venta
        const subventasResult = await client.query(
            "SELECT * FROM subventas WHERE id_venta = $1",
            [saleId]
        );
        const subventas = subventasResult.rows;

        // 3. Para cada subventa, revertir la reducción en inventario actualizando UN lote activo
        for (const subventa of subventas) {
            // Selecciona un lote activo para el producto (por ejemplo, el más antiguo)
            const loteResult = await client.query(
                "SELECT id_lote, cant FROM inventario WHERE id_prod = $1 AND estado != 'anulado' ORDER BY fecha_compra DESC LIMIT 1",
                [subventa.producto]
            );
            if (loteResult.rows.length > 0) {
                const lote = loteResult.rows[0];
                // Revertir la reducción: sumar la cantidad vendida a ese lote
                await client.query(
                    "UPDATE inventario SET cant = cant + $1 WHERE id_lote = $2",
                    [subventa.cantidad, lote.id]
                );
            } else {
                console.warn(`No se encontró lote activo para el producto ${subventa.producto}`);
            }
        }

        // 4. Anular todos los pagos asociados a la venta y obtener la suma total pagada
        const paymentsResult = await client.query(
            "SELECT COALESCE(SUM(pago), 0) AS total_pagado FROM pagos WHERE venta = $1 AND estado != 'anulado'",
            [saleId]
        );
        const totalPagado = Number(paymentsResult.rows[0].total_pagado);

        // Marcar todos los pagos de esa venta como "anulado"
        await client.query(
            "UPDATE pagos SET estado = 'anulado' WHERE venta = $1 AND estado != 'anulado'",
            [saleId]
        );

        // 5. Revertir el saldo del cliente (solo para ventas a crédito, es decir, cuando contado es false)
        // Se asume que al registrar la venta, el saldo del cliente se incrementó en sale.total.
        // Ahora se debe restar sale.total menos lo que ya se pagó.
        console.log(typeof sale.contado, sale.contado); // Verificar el tipo y valor real
        if (sale.contado === false) {
            const total = sale.total || 0;
            const pagado = totalPagado || 0;
            await client.query(
                "UPDATE clientes SET saldo = saldo - ($1::numeric - $2::numeric) WHERE id = $3",
                [total, pagado, sale.cliente]
            );

        }

        await client.query('COMMIT');
        res.json({
            message: 'Venta anulada y procesos revertidos correctamente',
            venta: sale,
            subventas: subventas,
            totalPagado
        });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error al anular la venta:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (client) client.release();
    }
});

//no implementado.
router.delete('/sales/:id', async (req, res) => {
    try {
        const result = await pool.query("DELETE FROM ventas WHERE id = $1", [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al eliminar la venta 😢');
    }
});

module.exports = router;
