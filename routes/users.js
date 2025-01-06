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
  
  
  
  