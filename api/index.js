const fs = require('fs');
const path = require('path');

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

const routeHandlers = {
  '/api/login': './login.js',
  '/api/register': './register.js',
  '/api/clientes': './clientes.js',
  '/api/tecnicos': './tecnicos.js',
  '/api/change-password': './change-password.js',
  '/api/dashboard-metrics': './dashboard-metrics.js',
  '/api/equipos': './equipos.js',
  '/api/ordenes': './ordenes.js',
  '/api/cotizaciones': './cotizaciones.js'
};

module.exports = async (req, res) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

  const handlerPath = routeHandlers[pathname];
  if (handlerPath) {
    try {
      const handler = require(path.join(__dirname, handlerPath));
      return handler(req, res);
    } catch (error) {
      console.error('Error en ruta API:', error);
      return res.status(500).json({ success: false, message: 'Error interno de la API' });
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