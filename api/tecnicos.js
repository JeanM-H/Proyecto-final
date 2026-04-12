const bcrypt = require('bcryptjs');
const supabase = require('./supabaseClient');

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

function generateTemporaryPassword(nombre, apellido) {
  const base = `${nombre || ''}${apellido || ''}`
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8) || 'usuario';
  const digits = Math.floor(100 + Math.random() * 900);
  return `${base}${digits}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('tecnicos')
        .select('id, usuario_id, especialidad, disponible, telefono_contacto, created_at, usuario:usuarios(nombre, email)')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error tecnicos:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener técnicos' });
      }

      return res.status(200).json({ success: true, tecnicos: data || [] });
    } catch (error) {
      console.error('Error tecnicos:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener técnicos' });
    }
  }

  if (req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const { nombre, apellido, email, especialidad, telefono_contacto } = payload;

      if (!nombre || !apellido || !email || !especialidad) {
        return res.status(400).json({ success: false, message: 'Datos incompletos para crear el técnico' });
      }

      const emailCheck = await supabase.from('usuarios').select('id').eq('email', email).maybeSingle();
      if (emailCheck.error) {
        console.error('Error verificando email técnico:', emailCheck.error);
        return res.status(500).json({ success: false, message: 'Error en servidor' });
      }
      if (emailCheck.data) {
        return res.status(409).json({ success: false, message: 'El email ya está registrado' });
      }

      const password = generateTemporaryPassword(nombre, apellido);
      const nombreCompleto = `${nombre.trim()} ${apellido.trim()}`;
      const { data: usuario, error: insertUserError } = await supabase
        .from('usuarios')
        .insert({ nombre: nombreCompleto, email, password, rol: 'Técnico', estado: true })
        .select('id')
        .single();

      if (insertUserError) {
        console.error('Error creando usuario técnico:', insertUserError);
        return res.status(500).json({ success: false, message: 'Error al crear técnico' });
      }

      const { data, error } = await supabase
        .from('tecnicos')
        .insert({ usuario_id: usuario.id, especialidad, disponible: true, telefono_contacto })
        .single();

      if (error) {
        console.error('Error creando técnico:', error);
        return res.status(500).json({ success: false, message: 'Error al crear técnico' });
      }

      return res.status(201).json({
        success: true,
        message: 'Técnico creado correctamente',
        tecnico: data,
        generatedPassword: password
      });
    } catch (error) {
      console.error('Error tecnicos POST:', error);
      return res.status(500).json({ success: false, message: 'Error al crear técnico' });
    }
  }

  return res.status(405).json({ success: false, message: 'Método no permitido' });
};