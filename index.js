const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcrypt');//para encriptar la contraseña no implementado
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());

// Middleware 
app.use(cors());
app.use(express.json());

// Pool de datos para conectarse a la base de datos
const pool = new Pool({
  host: process.env.DB_HOST,//los datos se extraen del archivo .env
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// api para obtener todos los usuarios (realmente no sirve de nada solo estaba probando xd)
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users'); 
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener los usuarios 😢');
  }
});

// Ruta para manejar el inicio de sesión
app.post('/login', async (req, res) => {
  const { id, password } = req.body;

  try {
    //  Comprueba si el usuario existe en la BD
    const result = await pool.query(`SELECT * FROM users WHERE id_user = ${id}`);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado 🤔' });
    }

    const user = result.rows[0];
    console.log('Consulta de Log-in con el user: ', user);
    // Comprobación de contraseña
    if (password !== user.password) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }
    //  Crear un token JWT (no implementado)
    const token = jwt.sign({ id: user.id_user}, 'clave_secreta', { expiresIn: '1h' });
    res.status(200).json({ message: 'Inicio de sesión exitoso', token });
    console.log('Inicio de sesión exitoso');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
    console.log('Error del servidor');  
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
