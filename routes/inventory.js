//RUTA PARA EL INVENTARIO GLOBAL
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener todos los lotes (solo si el lote esta activo, no incluye anulados y lotes cerrados)
router.get('/inventory', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT * FROM public.inventario WHERE estado='activo'");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  } finally {
    client.release();
  }
});

// Obtener los lotes de un producto específico (solo lotes activos)
router.get('/inventory/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    console.log('Solicitud de lotes, Código de producto:', id);
    const result = await client.query(`SELECT * FROM inventario WHERE id_prod=$1 AND estado='activo'`, [id]);
    console.table(result.rows);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  } finally {
    client.release();
  }
});

// Agregar un nuevo lote
router.post('/inventory', async (req, res) => {
  const client = await pool.connect();
  try {
    const { prod, cant, precio, fecha } = req.body;
    console.log('Solicitud para agregar lote. Producto ID:', prod, 'Cantidad:', cant);
    await client.query(
      `INSERT INTO inventario (id_prod, cant, precio_compra, fecha_compra) VALUES ($1, $2, $3, $4)`,
      [prod, cant, precio, fecha]
    );
    res.status(201).json({ message: 'Lote agregado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  } finally {
    client.release();
  }
});

// Reducir inventario por venta
router.post('/reduce-inventory', async (req, res) => {
  const client = await pool.connect();
  try {
    const { productoId, cantidadVendida } = req.body;

    if (!productoId || !cantidadVendida || cantidadVendida <= 0) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    let cantidadRestante = cantidadVendida;

    // Obtener lotes del producto ordenados por fecha de ingreso (FIFO)
    const lotes = await client.query(
      `SELECT id_lote, cant FROM inventario WHERE id_prod = $1 AND cant > 0 ORDER BY fecha_compra ASC;`,
      [productoId]
    );

    console.log('Actualización de inventario en proceso...');

    for (const lote of lotes.rows) {
      if (cantidadRestante <= 0) break;

      if (lote.cant <= cantidadRestante) {
        // Consumir todo el lote
        await client.query(
          `UPDATE inventario SET cant = 0, estado = 'inactivo' WHERE id_lote = $1`,
          [lote.id_lote]
        );
        cantidadRestante -= lote.cant;
      } else {
        // Consumir solo la cantidad necesaria
        await client.query(
          `UPDATE inventario SET cant = cant - $1 WHERE id_lote = $2`,
          [cantidadRestante, lote.id_lote]
        );
        cantidadRestante = 0;
      }
    }

    if (cantidadRestante > 0) {
      return res.status(400).json({ error: 'Stock insuficiente para cubrir la venta' });
    }

    return res.json({ mensaje: 'Venta registrada correctamente' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error al procesar la venta' });
  } finally {
    client.release();
  }
});

// Anulación de lote y ajuste de stock en productos
router.put('/inventory-cancel', async (req, res) => {
  const client = await pool.connect();
  try {
    const { lote, producto, stock } = req.body;

    const batch = await client.query(
      "UPDATE inventario SET estado='anulado' WHERE id_lote=$1 RETURNING *",
      [lote]
    );

    const product = await client.query(
      "UPDATE productos SET stock=stock-$1 WHERE id_prod=$2 RETURNING *",
      [stock, producto]
    );

    console.log('Anulación exitosa');
    console.table(batch.rows);
    console.table(product.rows);

    return res.json({ message: 'Anulación exitosa' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error en la anulación' });
  } finally {
    client.release();
  }
});

module.exports = router;
