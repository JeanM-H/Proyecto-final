const bcrypt = require('bcryptjs');
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

    if (!data.nombre || !data.apellido || !data.email || !data.password || !data.rol) {
      return res.status(400).json({ success: false, error: 'Datos incompletos' });
    }

    if (data.rol === 'Cliente' && !data.empresa) {
      return res.status(400).json({ success: false, error: 'La empresa es requerida para clientes' });
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

    const nombreCompleto = `${data.nombre.trim()} ${data.apellido.trim()}`;

    if (data.password.length < 6) {
      return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const hashedPassword = await bcrypt.hash(data.password.toString().trim(), 10);

    // Insertar nuevo usuario en la tabla usuarios
    const userPayload = {
      nombre: nombreCompleto,
      email: data.email,
      password: hashedPassword,
      rol: data.rol,
      estado: true,
      needs_password_change: false
    };

    let newUser;
    let insertError;

    ({ data: newUser, error: insertError } = await supabase
      .from('usuarios')
      .insert(userPayload)
      .select('id, nombre, email, rol')
      .single());

    if (insertError && insertError.message && insertError.message.includes('needs_password_change')) {
      delete userPayload.needs_password_change;
      ({ data: newUser, error: insertError } = await supabase
        .from('usuarios')
        .insert(userPayload)
        .select('id, nombre, email, rol')
        .single());
    }

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return res.status(500).json({ success: false, error: 'Error al registrar usuario' });
    }

    if (data.rol === 'Cliente') {
      const { error: clientError } = await supabase
        .from('clientes')
        .insert({
          usuario_id: newUser.id,
          empresa: data.empresa || null,
          telefono: data.telefono || null,
          direccion: data.direccion || null,
          ciudad: data.ciudad || null,
          pais: data.pais || null
        });

      if (clientError) {
        console.error('Supabase clientes insert error:', clientError);
        return res.status(500).json({ success: false, error: 'Error al guardar datos de cliente' });
      }
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