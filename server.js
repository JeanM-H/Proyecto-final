require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Servir archivos estáticos (HTML, CSS, JS)

// Rutas API
app.use('/api', require('./routes/auth'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/equipos', require('./routes/equipos'));
app.use('/api/tecnicos', require('./routes/tecnicos'));
app.use('/api/ordenes', require('./routes/ordenes'));
app.use('/api/cotizaciones', require('./routes/cotizaciones'));
app.use('/api/mantenimientos', require('./routes/mantenimientos'));
app.use('/api/repuestos', require('./routes/repuestos'));
app.use('/api/dashboard-metrics', require('./routes/dashboard-metrics'));
app.use('/api/debug', require('./routes/debug')); // DEBUG ONLY
app.use('/api/evidencias', require('./routes/evidencias'));
app.use('/api/detalle-repuestos', require('./routes/detalle_repuestos'));

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('CoolCare API funcionando');
});

app.listen(port, () => {
  console.log(`Servidor CoolCare corriendo en puerto ${port}`);
});
