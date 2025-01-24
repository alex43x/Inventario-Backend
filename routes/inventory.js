const express = require('express'); // Importa el módulo express
const router = express.Router();  // Crea un objeto Router(para manejar las diferentes operaciones del CRUD de productos)
const pool = require('../db'); // Importa el pool de datos de db/index.js

//Módulo para obtener todos los lotes
router.get('/inventory', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM inventario where cant>0');
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

router.post('/reduce-inventory', async (req, res) => {
    const { productoId, cantidadVendida } = req.body;
    
    console.log (productoId, cantidadVendida, "Llegué")

    if (!productoId || !cantidadVendida || cantidadVendida <= 0) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }
  
    let cantidadRestante = cantidadVendida;
  
    try {
      // Obtener lotes del producto ordenados por fecha_ingreso (antigüedad)
      const lotes = await pool.query(
        `SELECT id_lote, cant FROM inventario WHERE id_prod = $1 AND cant > 0 ORDER BY fecha_compra ASC;`,
        [productoId]
      );
      console.log(lotes.rows)
  
      for (const lote of lotes.rows) {
        if (cantidadRestante <= 0) break; // Salir si ya no hay cantidad restante
  
        if (lote.cant <= cantidadRestante) {
          // Si el lote tiene menos o igual cantidad que la restante, consumir todo el lote
          await pool.query(`UPDATE inventario SET cant = 0 WHERE id_lote = ?`, [lote.id_lote]);
          cantidadRestante -= lote.cant;
        } else {
          // Si el lote tiene más cantidad que la restante, consumir parcialmente el lote
          await pool.query(
            `UPDATE inventario SET cant = cant - $1 WHERE id_lote = $2`,
            [cantidadRestante, lote.id_lote]
          );
          cantidadRestante = 0; // Ya no queda cantidad por cubrir
        }
      }
  
      // Verificar si se pudo cubrir toda la cantidad vendida
      if (cantidadRestante > 0) {
        return res.status(400).json({
          error: 'Stock insuficiente para cubrir la venta',
        });
      }
  
      return res.json({ mensaje: 'Venta registrada correctamente' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error al procesar la venta' });
    }
  });

module.exports = router; 
