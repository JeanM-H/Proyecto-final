const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../supabaseClient');

const secret = process.env.JWT_SECRET || 'default_secret';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const pathSegments = pathname.split('/').filter(Boolean);
  const tecnicoId = pathSegments.length > 0 && !Number.isNaN(Number(pathSegments[0])) ? Number(pathSegments[0]) : null;

  if (req.method === 'GET') {
    try {
      if (pathSegments[0] === 'me') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ success: false, message: 'Token no proporcionado' });
        }

        const token = authHeader.substring(7);
        let decoded;
        try {
          decoded = jwt.verify(token, secret);
        } catch (error) {
          return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
        }

        if (!decoded || !decoded.id) {
          return res.status(401).json({ success: false, message: 'Token inválido' });
        }

        const { data, error } = await supabase
          .from('tecnicos')
          .select('id, usuario_id, especialidad, disponible, telefono_contacto, created_at, usuario:usuarios(nombre, email)')
          .eq('usuario_id', decoded.id)
          .maybeSingle();

        if (error) {
          console.error('Error tecnico me:', error);
          return res.status(500).json({ success: false, message: 'Error al obtener datos del técnico' });
        }

        if (!data) {
          return res.status(404).json({ success: false, message: 'Técnico no encontrado' });
        }

        return res.status(200).json({ success: true, tecnico: data });
      }

      if (tecnicoId) {
        const { data, error } = await supabase
          .from('tecnicos')
          .select('id, usuario_id, especialidad, disponible, telefono_contacto, created_at, usuario:usuarios(nombre, email)')
          .eq('id', tecnicoId)
          .maybeSingle();

        if (error) {
          console.error('Error tecnico by id:', error);
          return res.status(500).json({ success: false, message: 'Error al obtener el técnico' });
        }

        if (!data) {
          return res.status(404).json({ success: false, message: 'Técnico no encontrado' });
        }

        return res.status(200).json({ success: true, tecnico: data });
      }

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
      const hashedPassword = await bcrypt.hash(password, 10);
      const nombreCompleto = `${nombre.trim()} ${apellido.trim()}`;
      let usuarioPayload = {
        nombre: nombreCompleto,
        email,
        password: hashedPassword,
        rol: 'Técnico',
        estado: true,
        needs_password_change: true
      };

      let usuario;
      let insertUserError;
      ({ data: usuario, error: insertUserError } = await supabase
        .from('usuarios')
        .insert(usuarioPayload)
        .select('id')
        .single());

      if (insertUserError && insertUserError.message && insertUserError.message.includes('needs_password_change')) {
        usuarioPayload = {
          nombre: nombreCompleto,
          email,
          password: hashedPassword,
          rol: 'Técnico',
          estado: true
        };
        ({ data: usuario, error: insertUserError } = await supabase
          .from('usuarios')
          .insert(usuarioPayload)
          .select('id')
          .single());
      }

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

  if (req.method === 'DELETE') {
    if (!tecnicoId) {
      return res.status(400).json({ success: false, message: 'ID de técnico inválido' });
    }

    try {
      const { data: tecnico, error: selectError } = await supabase
        .from('tecnicos')
        .select('usuario_id')
        .eq('id', tecnicoId)
        .maybeSingle();

      if (selectError || !tecnico) {
        return res.status(404).json({ success: false, message: 'Técnico no encontrado' });
      }

      const { error: deleteTecnicoError } = await supabase
        .from('tecnicos')
        .delete()
        .eq('id', tecnicoId);

      if (deleteTecnicoError) {
        console.error('Error eliminando técnico:', deleteTecnicoError);
        return res.status(500).json({ success: false, message: 'Error al eliminar técnico' });
      }

      if (tecnico.usuario_id) {
        const { error: deleteUserError } = await supabase.from('usuarios').delete().eq('id', tecnico.usuario_id);
        if (deleteUserError) {
          console.error('Error eliminando usuario asociado:', deleteUserError);
          return res.status(500).json({ success: false, message: 'Error al eliminar usuario asociado' });
        }
      }

      return res.status(200).json({ success: true, message: 'Técnico eliminado correctamente' });
    } catch (error) {
      console.error('Error tecnicos DELETE:', error);
      return res.status(500).json({ success: false, message: 'Error al eliminar técnico' });
    }
  }

  return res.status(405).json({ success: false, message: 'Método no permitido' });
};