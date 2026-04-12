const bcrypt = require('bcryptjs');
const supabase = require('./supabaseClient');
const { generateToken } = require('../middleware/auth');

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
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  if (!supabase) {
    console.error('Supabase client not initialized in login handler.');
    return res.status(500).json({ success: false, message: 'Configuración de Supabase incompleta en el servidor' });
  }

  try {
    const data = await parseJsonBody(req);

    if (!data.email || !data.password || !data.role) {
      return res.status(400).json({ success: false, message: 'Datos incompletos' });
    }

    let userResult = await supabase
      .from('usuarios')
      .select('id, nombre, email, rol, password, estado, needs_password_change')
      .eq('email', data.email)
      .eq('rol', data.role)
      .maybeSingle();

    if (userResult.error && userResult.error.message && userResult.error.message.includes('needs_password_change')) {
      userResult = await supabase
        .from('usuarios')
        .select('id, nombre, email, rol, password, estado')
        .eq('email', data.email)
        .eq('rol', data.role)
        .maybeSingle();
    }

    const { data: user, error } = userResult;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ success: false, message: 'Error en servidor' });
    }

    const hasValidPassword = user && await bcrypt.compare(data.password.toString(), user.password || '');
    const isActive = user && (user.estado === true || user.estado === 1);

    if (!user || !isActive || !hasValidPassword) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado, contraseña inválida o rol incorrecto' });
    }

    const token = generateToken({ id: user.id, email: user.email, rol: user.rol });

    return res.status(200).json({
      success: true,
      message: 'Login exitoso',
      token,
      needsPasswordChange: Boolean(user.needs_password_change),
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
};