//RUTA DEL LOGIN
const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

// Ruta para manejar el inicio de sesión
router.post('/login', async (req, res) => {
  const { id, password } = req.body;
  console.log("Solicitud de login recibida:", id);
  const client = await pool.connect()
  try {
    // Verificar si el usuario existe
    const result = await client.query("SELECT * FROM public.users WHERE id_user = $1", [id]);
    if (result.rows.length === 0) {
      console.log("Usuario no encontrado");
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    const user = result.rows[0];

    // Comparar contraseña sin exponer detalles (REEMPLAZAR ESTO POR HASHING REAL)
    if (password !== user.password) {
      console.log("Contraseña incorrecta para el usuario:", id);
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    // Generar token seguro 
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
      console.error("Error: JWT_SECRET no está definido en el .env");
      return res.status(500).json({ message: 'Error interno del servidor' });
    }

    const token = jwt.sign(
      { id: user.id_user, username: user.username },
      secretKey,
      { expiresIn: '3h' }
    );

    console.log("Inicio de sesión exitoso:", user.username);
    res.status(200).json({ message: 'Inicio de sesión exitoso', token });

  } catch (error) {
    console.error("Error en el login:", error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally{
    client.release();
  }
});

module.exports = router;
