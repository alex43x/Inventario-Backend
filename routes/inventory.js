const express = require('express'); // Importa el módulo express
const router = express.Router();  // Crea un objeto Router(para manejar las diferentes operaciones del CRUD de productos)
const pool = require('../db'); // Importa el pool de datos de db/index.js

//Módulo para obtener todos los lotes
router.get('/inventory', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM inventario where estado='activo'");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
})

//Módulo para obtener los lotes de un producto en específico
router.get('/inventory/:id', async (req, res) => {
  const { id } = req.params;
  console.log('Solicitud de Lotes, Código de producto: ', id)
  try {
    const result = await pool.query(`SELECT * FROM inventario WHERE id_prod=$1 and estado='activo'`, [id]);
    console.table(result.rows)
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
})

router.post('/inventory', async (req, res) => {
  const { prod, cant, precio, fecha } = req.body;
  console.log('Solicitud para agregar lote. Producto ID: ', prod, ' Cantidad: ', cant);
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
    console.log('Actualizacion de inventario en proceso...')


    for (const lote of lotes.rows) {
      if (cantidadRestante <= 0) break; // Salir si ya no hay cantidad restante

      if (lote.cant <= cantidadRestante) {
        // Si el lote tiene menos o igual cantidad que la restante, consumir todo el lote
        await pool.query(`UPDATE inventario SET cant = 0 estado = 'inactivo' WHERE id_lote = $1`, [lote.id_lote]);
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

router.put('/inventory-cancel', async (req, res) => {
  const { lote, producto, stock } = req.body;
  try {
    const batch= await pool.query("Update inventario set estado='anulado' where id_lote=$1 returning *", [lote])
    const product= await pool.query("Update productos set stock=stock-$1 where id_prod=$2 returning *", [stock, producto])
    console.log('Anulación exitosa')
    console.table(batch.rows)
    console.table(product.rows)
    return res.json({ message: 'Anulación exitosa' })
  }catch(error){
    console.error(error);
    return res.status(500).json({error: 'Error en la anulación'})
  }
})
module.exports = router; 
