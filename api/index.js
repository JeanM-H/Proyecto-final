const fs = require('fs');
const path = require('path');
const url = require('url');

module.exports = async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // API: Health check
  if (pathname === '/api/health') {
    return res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  }

  // API: Info
  if (pathname === '/api') {
    return res.status(200).json({ 
      mensaje: 'API de Climatización - Sistema de Mantenimiento',
      version: '1.0.0',
      status: 'OK'
    });
  }

  // API: Login
  if (pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        // Por ahora, aceptamos cualquier email/password (sin BD)
        if (data.email && data.password && data.role) {
          return res.status(200).json({ 
            success: true, 
            message: 'Login exitoso',
            user: {
              email: data.email,
              role: data.role
            }
          });
        }
        res.status(400).json({ success: false, message: 'Datos incompletos' });
      } catch (e) {
        res.status(500).json({ success: false, message: 'Error en servidor' });
      }
    });
    return;
  }

  // Servir index.html para todas las otras rutas
  try {
    const filePath = path.join(__dirname, '..', 'index.html');
    const html = fs.readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (err) {
    res.status(200).json({ status: 'OK' });
  }
};