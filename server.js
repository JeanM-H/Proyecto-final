require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Servir archivos estáticos (HTML, CSS, JS)

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clientes', require('./routes/clientes'));
// Agregar más rutas aquí: equipos, tecnicos, ordenes, etc.

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('CoolCare API funcionando');
});

app.listen(port, () => {
  console.log(`Servidor CoolCare corriendo en puerto ${port}`);
});
