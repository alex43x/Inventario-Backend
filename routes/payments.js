const express = require('express'); // Importa el módulo express
const router = express.Router(); // Crea un objeto Router
const pool = require('../db'); // Configura tu conexión a PostgreSQL
const axios = require('axios')

router.get('/payments', async (req, res) => {
    try {
        const result = await pool.query('SELECT * from pagos');
        res.json(result.rows);
        console.log('Consulta de pagos realizada')
        console.table(result.rows)
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener los pagos 😢');
    }
});

router.get('/payments/:customer', async (req, res) => {
    const { customer } = req.params
    const { saldo } = req.query
    try {
        const payments = await pool.query("select pago, fecha, 'Pago' as origen from pagos where cliente=$1 and estado != 'anulado' union all select total,fecha, 'Venta' as origen from ventas where cliente=$1 and estado!='anulado' order by fecha desc limit 15", [customer]);
        console.log('Consulta de pagos por cliente: ', customer)
        payments.rows[0].saldo = Number(saldo);
        for (let i = 1; i < payments.rows.length; i++) {
            if (payments.rows[i - 1].origen == "Venta") {
                payments.rows[i].saldo = Number(payments.rows[i - 1].saldo) - Number(payments.rows[i - 1].pago)
            } else {
                payments.rows[i].saldo = Number(payments.rows[i - 1].pago) + Number(payments.rows[i - 1].saldo)
            }
        }
        console.table(payments.rows);
        res.json(payments.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener pagos')
    }
});

router.get("/movements", async (req, res) => {
    try {
        const query = `
            SELECT 
                productos.nombre AS elemento, 
                (inventario.precio_compra * inventario.cant) AS total, 
                inventario.cant as cantidad,
	            inventario.fecha_compra as fecha
            FROM 
                inventario
            JOIN 
                 productos ON inventario.id_prod = productos.id_prod 
            WHERE 
                inventario.cant > 0 
            order by fecha_compra desc
            limit 10;`;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al obtener los datos");
    }
});

router.post('/payments', async (req, res) => {
    const { venta, pago, fecha, contado, cliente, estado } = req.body;
    console.log('Solicitud de registro de pago en proceso...', req.body)
    try {
        const newSale = await pool.query(
            'INSERT INTO pagos (venta, pago, fecha , contado, cliente, estado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [venta, pago, fecha, contado, cliente, estado]
        );
        res.json(newSale.rows[0]);
        console.log('Pago exitoso:');
        console.table(newSale.rows)
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.error("Error al registrar pago 😢");
    }
});

router.put('/payments-cancel', async (req, res) => {
    const { pago, monto, cliente } = req.body;
    console.log('Solicitud de anulación de pago...', req.body)
    try {
        const payment = await pool.query(
            "UPDATE pagos set estado='anulado' where id=$1 returning *",
            [pago]
        );
        const saldo = await pool.query(
            "UPDATE clientes set saldo=saldo-$1 where id=$2",
            [monto, cliente]
        );
        res.json({ message: 'Pago anulado...' });
        console.log('Pago exitoso:');
        console.table(payment.rows)
        console.table(saldo.rows)
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.error("Error al anular pago");
    }
});

router.post('/payments-debt', async (req, res) => {
    const { pago, fecha, cliente } = req.body;
    console.log('Solicitud de registro de pago en proceso...', req.body)
    try {
        const sales = await pool.query("SELECT id, total from ventas where cliente=$1 and estado='pendiente' order by fecha asc", [cliente]);
        let montoRestante = pago;
        let i = 0;
        const pendingSales = sales.rows

        while (montoRestante > 0) {
            let payments = await pool.query("SELECT SUM(pago) AS total_pagado FROM pagos WHERE cliente = $1 AND estado = 'pendiente' AND venta = $2", [cliente, pendingSales[i].id]);
            let payed = payments.rows[0].total_pagado
            console.log(pendingSales[i].id)
            if (montoRestante >= (pendingSales[i].total - payed)) {
                await pool.query("INSERT INTO pagos (venta, pago, fecha, contado, cliente, estado) values ($1,$2,$3, $4, $5, $6)", [pendingSales[i].id, pendingSales[i].total - payed, fecha, false, cliente, 'cerrado']);
                montoRestante -= (pendingSales[i].total - payed);
                await pool.query("UPDATE ventas set estado='cerrado' where id=$1", [pendingSales[i].id]);
                await pool.query("UPDATE pagos set estado= 'cerrado' where venta=$1", [pendingSales[i].id]);
                //registrar el pago de lo que falta y acutualizar el valor de montoRestante
            } else {
                await pool.query("INSERT INTO pagos (venta, pago, fecha, contado, cliente, estado) values ($1, $2, $3, $4, $5, $6)", [pendingSales[i].id, montoRestante, fecha, false, cliente, 'pendiente']);
                montoRestante = 0;
            }
            i++;
        }
        await pool.query("UPDATE clientes set saldo=saldo-$1 where id=$2", [pago, cliente])
        res.json({ message: 'Pago exitoso' })
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.error("Error al registrar pago 😢");
    }
});

module.exports = router