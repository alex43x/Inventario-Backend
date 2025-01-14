const express = require('express'); // Importa el módulo express
const router = express.Router();  // Crea un objeto Router(para manejar las diferentes operaciones del CRUD de productos)
const pool = require('../db'); // Importa el pool de datos de db/index.js

//Módulo para obtener todos los lotes
router.get('/inventory', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM inventario');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error del servidor' });
    }
})

//Módulo para obtener los lotes de un producto en específico
router.get('/inventory/:id', async (req, res) => {
    const{id}=req.params;
    console.log('Solicitud de Lotes, Código de producto: ', id)
    try {
        const result = await pool.query(`SELECT * FROM inventario WHERE id_prod=$1`,[id]);
        console.table(result.rows)
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error del servidor' });
    }
})

router.post('/inventory', async (req, res) => {
    const { prod, cant, precio, fecha } = req.body;
    console.log('datos: ', prod, cant, precio, fecha);
    try {
        await pool.query(`INSERT INTO inventario (id_prod, cant, precio_compra, fecha_compra) VALUES ('${prod}', ${cant}, ${precio}, '${fecha}')`);
        res.status(201).json({ message: 'Producto creado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error del servidor' });
    }
})

module.exports = router; 
