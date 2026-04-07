const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api', (req, res) => {
    res.json({
        mensaje: 'API de Climatización - Sistema de Mantenimiento',
        version: '1.0.0',
        estado: 'En desarrollo',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`?? Servidor ejecutándose en puerto ${PORT}`);
    console.log(`?? Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
