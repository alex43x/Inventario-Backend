//RUTA PARA GESTION DE PAGOS
const express = require('express');
const router = express.Router();
const pool = require('../db');
const axios = require('axios');

//Obtener pagos en general
router.get('/payments', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * from public.pagos');
        res.json(result.rows);
        console.log('Consulta de pagos realizada');
        console.table(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener los pagos 😢');
    } finally {
        client.release();
    }
});

//Obtener pagos por cliente (no incluye anulados)
router.get('/payments/:customer', async (req, res) => {
    const client = await pool.connect();
    const { customer } = req.params;
    const { saldo } = req.query;
    try {
        const payments = await client.query("select pago, fecha, 'Pago' as origen from public.pagos where cliente=$1 and estado != 'anulado' union all select total,fecha, 'Venta' as origen from public.ventas where cliente=$1 and estado!='anulado' order by fecha desc limit 15", [customer]);
        console.log('Consulta de pagos por cliente: ', customer);
        payments.rows[0].saldo = Number(saldo);
        for (let i = 1; i < payments.rows.length; i++) {
            if (payments.rows[i - 1].origen == "Venta") {
                payments.rows[i].saldo = Number(payments.rows[i - 1].saldo) - Number(payments.rows[i - 1].pago);
            } else {
                payments.rows[i].saldo = Number(payments.rows[i - 1].pago) + Number(payments.rows[i - 1].saldo);
            }
        }
        console.table(payments.rows);
        res.json(payments.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener pagos');
    } finally {
        client.release();
    }
});

//Obtener ultimos movimientos(ventas y compras)
router.get("/movements", async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        const query = `
            SELECT 
                productos.nombre AS elemento, 
                (inventario.precio_compra * inventario.cant) AS total, 
                inventario.cant as cantidad,
                inventario.fecha_compra as fecha
            FROM 
                public.inventario
            JOIN 
                public.productos ON inventario.id_prod = productos.id_prod 
            WHERE 
                inventario.cant > 0 
            ORDER BY fecha_compra DESC
            LIMIT 15;`;
        const result = await client.query(query);
        res.json(result.rows);
        console.log("Consulta de movimientos realizada");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al obtener los datos");
    } finally {
        if (client) client.release();
    }
});

//Registrar pagos por venta
router.post('/payments', async (req, res) => {
    const client = await pool.connect();
    const { venta, pago, fecha, contado, cliente, estado } = req.body;
    console.log('Solicitud de registro de pago en proceso...', req.body);
    try {
        const newSale = await client.query(
            'INSERT INTO pagos (venta, pago, fecha , contado, cliente, estado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [venta, pago, fecha, contado, cliente, estado]
        );
        res.json(newSale.rows[0]);
        console.log('Pago exitoso:');
        console.table(newSale.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.error("Error al registrar pago 😢");
    } finally {
        client.release();
    }
});

//Cancelar pagos (No implementado)
router.put('/payments-cancel', async (req, res) => {
    const { pago, monto, cliente } = req.body;
    console.log('Solicitud de anulación de pago...', req.body);
    let client;

    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const payment = await client.query(
            "UPDATE pagos SET estado='anulado' WHERE id=$1 RETURNING *",
            [pago]
        );

        const saldo = await client.query(
            "UPDATE clientes SET saldo=saldo-$1 WHERE id=$2 RETURNING *",
            [monto, cliente]
        );

        await client.query('COMMIT');
        res.json({ message: 'Pago anulado...' });

        console.log('Pago anulado con éxito:');
        console.table(payment.rows);
        console.table(saldo.rows);
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("Error al anular pago", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (client) client.release();
    }
});

//Registro de pagos por venta a crédito
router.post('/payments-debt', async (req, res) => {
    const { pago, fecha, cliente } = req.body;
    console.log('Solicitud de registro de pago en proceso...', req.body);
    let client;

    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const sales = await client.query(
            "SELECT id, total FROM ventas WHERE cliente=$1 AND estado='pendiente' ORDER BY fecha ASC",
            [cliente]
        );

        let montoRestante = pago;
        let i = 0;
        const pendingSales = sales.rows;

        while (montoRestante > 0 && i < pendingSales.length) {
            let payments = await client.query(
                "SELECT COALESCE(SUM(pago), 0) AS total_pagado FROM pagos WHERE cliente = $1 AND estado = 'pendiente' AND venta = $2",
                [cliente, pendingSales[i].id]
            );

            let payed = payments.rows[0].total_pagado;
            let saldoVenta = pendingSales[i].total - payed;

            if (montoRestante >= saldoVenta) {
                await client.query(
                    "INSERT INTO pagos (venta, pago, fecha, contado, cliente, estado) VALUES ($1, $2, $3, $4, $5, $6)",
                    [pendingSales[i].id, saldoVenta, fecha, false, cliente, 'cerrado']
                );

                montoRestante -= saldoVenta;

                await client.query("UPDATE ventas SET estado='cerrado' WHERE id=$1", [pendingSales[i].id]);
                await client.query("UPDATE pagos SET estado='cerrado' WHERE venta=$1", [pendingSales[i].id]);
            } else {
                await client.query(
                    "INSERT INTO pagos (venta, pago, fecha, contado, cliente, estado) VALUES ($1, $2, $3, $4, $5, $6)",
                    [pendingSales[i].id, montoRestante, fecha, false, cliente, 'pendiente']
                );

                montoRestante = 0;
            }

            i++;
        }

        await client.query(
            "UPDATE clientes SET saldo=saldo-$1 WHERE id=$2 RETURNING *",
            [pago, cliente]
        );

        await client.query('COMMIT');
        res.json({ message: 'Pago exitoso' });
        console.log('Pago registrado con éxito');
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("Error al registrar pago 😢", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (client) client.release();
    }
});

module.exports = router;
