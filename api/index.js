const fs = require('fs');
const path = require('path');

const routeHandlers = {
  '/api/login': require('./login.js'),
  '/api/register': require('./register.js'),
  '/api/clientes': require('./clientes.js'),
  '/api/tecnicos': require('./tecnicos.js'),
  '/api/change-password': require('./change-password.js'),
  '/api/forgot-password': require('./forgot-password.js'),
  '/api/reset-password': require('./reset-password.js'),
  '/api/dashboard-metrics': require('./dashboard-metrics.js'),
  '/api/equipos': require('./equipos.js'),
  '/api/ordenes': require('./ordenes.js'),
  '/api/cotizaciones': require('./cotizaciones.js'),
  '/api/repuestos': require('../repuestos.js'),
  '/api/evidencias': require('../evidencias.js'),
  '/api/mantenimientos': require('../routes/mantenimientos.js'),
  '/api/auth/login': require('./login.js'),
  '/api/auth/register': require('./register.js'),
  '/api/auth/change-password': require('./change-password.js'),
  '/api/auth/forgot-password': require('./forgot-password.js'),
  '/api/auth/reset-password': require('./reset-password.js')
};

module.exports = async (req, res) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname === '/api/health') {
    return res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  }

  if (pathname === '/api') {
    return res.status(200).json({
      mensaje: 'API de Climatización - Sistema de Mantenimiento',
      version: '1.0.0',
      status: 'OK'
    });
  }

  // Manejo inline para rutas específicas
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    return res.status(200).json({ success: true, message: 'Logout exitoso' });
  }

  if (pathname === '/api/auth/validate' && req.method === 'GET') {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'default_secret';
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, secret);
      return res.status(200).json({ success: true, user: decoded });
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
    }
  }

  const normalizedPath = routeHandlers[pathname]
    ? pathname
    : '/' + pathname.split('/').filter(Boolean).slice(0, 2).join('/');
  const handler = routeHandlers[normalizedPath];
  if (handler) {
    try {
      // Ajustar req.url para que el router de Express reciba la ruta relativa correcta.
      const relativePath = pathname.replace(normalizedPath, '') || '/';
      req.url = relativePath;
      req.originalUrl = pathname;
      await handler(req, res);
      return;
    } catch (error) {
      console.error('Error en ruta API:', error);
      return res.status(500).json({ success: false, message: 'Error interno de la API', detail: error.message });
    }
  }

  try {
    const filePath = path.join(__dirname, '..', 'index.html');
    const html = fs.readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    return res.status(404).json({ status: 'Not Found' });
  }
};