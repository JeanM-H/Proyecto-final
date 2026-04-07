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
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const data = await parseJsonBody(req);

    if (!data.nombre || !data.apellido || !data.email || !data.telefono || !data.direccion || !data.password || !data.rol) {
      return res.status(400).json({ success: false, error: 'Datos incompletos' });
    }

    // Verificar si el email ya existe
    const { data: existingUser, error: checkError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', data.email)
      .maybeSingle();

    if (checkError) {
      console.error('Supabase error:', checkError);
      return res.status(500).json({ success: false, error: 'Error en servidor' });
    }

    if (existingUser) {
      return res.status(409).json({ success: false, error: 'El email ya está registrado' });
    }

    // Insertar nuevo usuario
    const { data: newUser, error: insertError } = await supabase
      .from('usuarios')
      .insert({
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email,
        telefono: data.telefono,
        direccion: data.direccion,
        password: data.password,
        rol: data.rol,
        estado: true,
        fecha_creacion: new Date().toISOString()
      })
      .select('id, nombre, email, rol')
      .single();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return res.status(500).json({ success: false, error: 'Error al registrar usuario' });
    }

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: newUser
    });
  } catch (error) {
    console.error('Error en registro:', error);
    return res.status(500).json({ success: false, error: 'Error en servidor' });
  }
};