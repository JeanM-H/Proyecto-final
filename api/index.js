const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan las variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

  if (pathname === '/api/login' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);

      if (!data.email || !data.password || !data.role) {
        return res.status(400).json({ success: false, message: 'Datos incompletos' });
      }

      const { data: user, error } = await supabase
        .from('usuarios')
        .select('id, nombre, email, rol, password, estado')
        .eq('email', data.email)
        .eq('rol', data.role)
        .maybeSingle();

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ success: false, message: 'Error en servidor' });
      }

      if (!user || user.estado !== 1 || user.password !== data.password) {
        return res.status(401).json({ success: false, message: 'Usuario no encontrado, contraseña inválida o rol incorrecto' });
      }

      return res.status(200).json({
        success: true,
        message: 'Login exitoso',
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      return res.status(500).json({ success: false, message: 'Error en servidor' });
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