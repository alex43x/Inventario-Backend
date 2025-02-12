const express = require('express');
const router = express.Router();
const pool = require('../db'); // Asegúrate de que `pool` esté configurado para conectar a PostgreSQL

router.get('/reportes', async (req, res) => {
    try {
        // 1️⃣ Ventas por vendedor
        const ventasVendedores = await pool.query(`
            SELECT v.vendedor as elemento, u.username as cantidad, SUM(v.total) AS total
            FROM ventas v
            JOIN users u ON v.vendedor = u.id_user
            WHERE v.fecha BETWEEN NOW() - INTERVAL '30 days' AND NOW()
            GROUP BY v.vendedor, u.username
            ORDER BY total DESC
        `);

        // 2️⃣ Clientes con más compras
        const clientesTop = await pool.query(`
            SELECT c.id AS elemento, c.nombre as cantidad, COUNT(v.id) AS total
            FROM ventas v
            JOIN clientes c ON v.cliente = c.id
            WHERE v.fecha >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY c.id, c.nombre
            ORDER BY total DESC
            LIMIT 5;


        `);

        const clientesTopRecaudacion = await pool.query(`
            SELECT 
                v.cliente as elemento, 
                c.nombre as cantidad, 
                COALESCE(SUM(v.total), 0) AS total
            FROM ventas v
            JOIN clientes c ON v.cliente = c.id
            WHERE v.fecha >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY v.cliente, c.nombre
            ORDER BY total DESC
            LIMIT 5;

        `);

        // 3️⃣ Productos más vendidos en los últimos 30 días
        const productosMasVendidos = await pool.query(`
            SELECT p.id_prod as elemento, p.nombre as cantidad, SUM(sv.cantidad) AS total
            FROM subventas sv
            JOIN productos p ON sv.producto = p.id_prod
            JOIN ventas v ON sv.id_venta = v.id
            WHERE v.fecha BETWEEN DATE_TRUNC('month', CURRENT_DATE) 
                              AND (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')
            GROUP BY p.id_prod, p.nombre
            ORDER BY total DESC
            LIMIT 5
        `);

        // 4️⃣ Recaudación total en los últimos 3 días
        const recaudacionTotal = await pool.query(`
            SELECT SUM(total) AS recaudacion
            FROM ventas
            WHERE fecha BETWEEN NOW() - INTERVAL '30 days' AND NOW()
        `);

        const ventasPorCategoria = await pool.query(`
            SELECT c.nombre AS categoria, SUM(sv.total) AS total_vendido
            FROM subventas sv
            JOIN productos p ON sv.producto = p.id_prod
            JOIN categorias c ON p.categoria = c.id
            JOIN ventas v ON sv.id_venta = v.id
            WHERE v.fecha >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY c.id, c.nombre
            ORDER BY total_vendido DESC
        `);

        // 5️⃣ Cálculo de IVA DF (Directo de ventas)
        const ivaDf = await pool.query(`
            SELECT SUM(iva) AS iva_df
            FROM ventas
            WHERE fecha BETWEEN DATE_TRUNC('month', CURRENT_DATE) 
                            AND (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')
        `);

        // 6️⃣ Cálculo de IVA CF (Compras según productos)
        const ivaCf = await pool.query(`
            SELECT 
                SUM(
                    CASE 
                        WHEN p.iva = 10 THEN (i.cant * i.precio_compra) / 11
                        WHEN p.iva = 5  THEN (i.cant * i.precio_compra) / 21
                        ELSE 0
                    END
                ) AS iva_cf
            FROM inventario i
            JOIN productos p ON i.id_prod = p.id_prod
            WHERE i.fecha_compra BETWEEN DATE_TRUNC('month', CURRENT_DATE) 
                                    AND (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day') 
            AND i.estado != 'anulado'
        `);

        // 📌 Responder con todos los datos en un JSON
        res.json({
            ventas_por_vendedor: ventasVendedores.rows,
            clientes_cantidad: clientesTop.rows,
            clientes_top_recaudacion: clientesTopRecaudacion.rows,
            productos_mas_vendidos: productosMasVendidos.rows,
            ventas_por_categoria: ventasPorCategoria.rows,
            iva_df: ivaDf.rows[0].iva_df || 0,
            iva_cf: ivaCf.rows[0].iva_cf || 0
        });

        console.log('✅ Reporte generado correctamente');
    } catch (err) {
        console.error('❌ Error al obtener el reporte:', err);
        res.status(500).send('Error al obtener los reportes 😢');
    }
});

module.exports = router;
