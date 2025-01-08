const express = require('express'); // Importa el módulo express
const router = express.Router(); // Crea un objeto Router
const pool = require('../db'); // Configura tu conexión a PostgreSQL

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
      console.log('Consulta de Log-in con el user: ', user.username);
      // Comprobación de contraseña
      if (password !== user.password) {
        console.log('Constraseña incorrecta'); 
        return res.status(401).json({ message: 'Contraseña incorrecta' });
      }
      //  Crear un token JWT (no implementado)
      //const token = jwt.sign({ id: user.id_user}, 'clave_secreta', { expiresIn: '1h' });
      res.status(200).json({ message: 'Inicio de sesión exitoso'});
      console.log('Inicio de sesión exitoso, User: ', user.username);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error del servidor' });
    }
  });

module.exports = router;