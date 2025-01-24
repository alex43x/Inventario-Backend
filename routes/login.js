const express = require('express'); // Importa el módulo express
const router = express.Router(); // Crea un objeto Router
const pool = require('../db'); // Configura tu conexión a PostgreSQL
const jwt= require('jsonwebtoken')
require('dotenv').config();



// Ruta para manejar el inicio de sesión
router.post('/login', async (req, res) => {
    const { id, password } = req.body;
    try {
      //  Comprueba si el usuario existe en la BD
      const result = await pool.query(`SELECT * FROM users WHERE id_user = ${id}`);
      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Usuario no encontrado 🤔' });
      }
  
      const user = result.rows[0];
      
      if (password !== user.password) {// Comprobación de contraseña
        console.log('Constraseña incorrecta'); 
        return res.status(401).json({ message: 'Contraseña incorrecta' });
      }

      secret_key= process.env.JWT_SECRET
      const token = jwt.sign({ id: user.id_user, password: user.password, username: user.username}, secret_key, { expiresIn: '1h' });
      res.status(200).json({ message: 'Inicio de sesión exitoso', token});
      console.log('Inicio de sesión exitoso, User: ', user.username);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error del servidor' });
    }
  });

module.exports = router;