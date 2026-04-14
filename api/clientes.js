const bcrypt = require('bcryptjs');
const supabase = require('../supabaseClient');

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
function splitUsuarioFullName(fullName = '') {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { nombre: '', apellido: '' };
  }
  if (parts.length === 1) {
    return { nombre: parts[0], apellido: '' };
  }
  const apellido = parts.pop();
  return { nombre: parts.join(' '), apellido };
}

function formatClienteUsuario(cliente) {
  if (!cliente || !cliente.usuario) return cliente;
  const parsed = splitUsuarioFullName(cliente.usuario.nombre);
  return {
    ...cliente,
    usuario: {
      ...cliente.usuario,
      nombre: parsed.nombre,
      apellido: parsed.apellido
    }
  };
}

const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET || 'default_secret';

function buildFullName(nombre, apellido, existingFullName = '') {
  const rawName = (nombre || '').trim();
  const rawApellido = (apellido || '').trim();
  const existingParts = (existingFullName || '').trim().split(/\s+/).filter(Boolean);

  if (rawName && rawApellido) {
    return `${rawName} ${rawApellido}`.trim();
  }

  if (rawName) {
    if (existingParts.length > 1) {
      return `${rawName} ${existingParts.slice(1).join(' ')}`.trim();
    }
    return rawName;
  }

  if (rawApellido) {
    if (existingParts.length > 1) {
      return `${existingParts.slice(0, -1).join(' ')} ${rawApellido}`.trim();
    }
    if (existingParts.length === 1) {
      return `${existingParts[0]} ${rawApellido}`.trim();
    }
    return rawApellido;
  }

  return existingFullName.trim();
}

function getUserFromToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token no proporcionado');
  }
  const token = authHeader.substring(7);
  return jwt.verify(token, jwtSecret);
}

async function getClienteByUserId(userId) {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, usuario_id, empresa, telefono, direccion, ciudad, pais, created_at, usuario:usuarios(nombre, email)')
    .eq('usuario_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const subPath = pathSegments.slice(2);
  const isMeRoute = subPath[0] === 'me';

  if (isMeRoute) {
    let user;
    try {
      user = getUserFromToken(req);
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token inválido o no proporcionado' });
    }

    const userId = user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado en el token' });
    }

    if (req.method === 'GET' && subPath.length === 1) {
      try {
        const cliente = await getClienteByUserId(userId);
        if (!cliente) {
          return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }
        return res.status(200).json({ success: true, cliente: formatClienteUsuario(cliente) });
      } catch (error) {
        console.error('Error clientes /me:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener datos de cliente' });
      }
    }

    if (req.method === 'GET' && subPath[1] === 'ordenes') {
      try {
        const cliente = await getClienteByUserId(userId);
        if (!cliente) {
          return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }
        const { data, error } = await supabase
          .from('ordenes_mantenimiento')
          .select('id, cliente_id, equipo_id, tecnico_id, tipo, descripcion, estado, fecha_programada, fecha_completada, created_at, equipo:equipos_climatizacion(modelo,marca,serial), tecnico:tecnicos(especialidad)')
          .eq('cliente_id', cliente.id)
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Error clientes /me/ordenes:', error);
          return res.status(500).json({ success: false, message: 'Error al obtener órdenes' });
        }
        return res.status(200).json({ success: true, ordenes: data || [] });
      } catch (error) {
        console.error('Error clientes /me/ordenes:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener órdenes' });
      }
    }

    if (req.method === 'GET' && subPath[1] === 'cotizaciones') {
      try {
        const cliente = await getClienteByUserId(userId);
        if (!cliente) {
          return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }
        const { data, error } = await supabase
          .from('cotizaciones')
          .select('id, descripcion, monto_estimado, estado, fecha_solicitud, fecha_respuesta, created_at')
          .eq('cliente_id', cliente.id)
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Error clientes /me/cotizaciones:', error);
          return res.status(500).json({ success: false, message: 'Error al obtener cotizaciones' });
        }
        return res.status(200).json({ success: true, cotizaciones: data || [] });
      } catch (error) {
        console.error('Error clientes /me/cotizaciones:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener cotizaciones' });
      }
    }

    if (req.method === 'GET' && subPath[1] === 'equipos') {
      try {
        const cliente = await getClienteByUserId(userId);
        if (!cliente) {
          return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }
        const { data, error } = await supabase
          .from('equipos_climatizacion')
          .select('id, marca, modelo, serial, tipo, estado, fecha_instalacion, ubicacion, created_at')
          .eq('cliente_id', cliente.id)
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Error clientes /me/equipos:', error);
          return res.status(500).json({ success: false, message: 'Error al obtener equipos' });
        }
        return res.status(200).json({ success: true, equipos: data || [] });
      } catch (error) {
        console.error('Error clientes /me/equipos:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener equipos' });
      }
    }

    if (req.method === 'POST' && subPath[1] === 'solicitudes') {
      try {
        const cliente = await getClienteByUserId(userId);
        if (!cliente) {
          return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }
        const data = await parseJsonBody(req);
        const { equipo_id, tipo, descripcion, fecha_deseada } = data;
        if (!equipo_id || !tipo || !descripcion) {
          return res.status(400).json({ success: false, message: 'Equipo, tipo y descripción son requeridos' });
        }
        const { data: equipo, error: equipoError } = await supabase
          .from('equipos_climatizacion')
          .select('id')
          .eq('id', equipo_id)
          .eq('cliente_id', cliente.id)
          .maybeSingle();
        if (equipoError || !equipo) {
          return res.status(404).json({ success: false, message: 'Equipo no encontrado o no pertenece al cliente' });
        }
        const { data: orden, error: ordenError } = await supabase
          .from('ordenes_mantenimiento')
          .insert({
            cliente_id: cliente.id,
            equipo_id,
            tipo,
            descripcion,
            estado: 'Pendiente',
            fecha_programada: fecha_deseada || null
          })
          .select()
          .single();
        if (ordenError) {
          console.error('Error creando solicitud:', ordenError);
          return res.status(500).json({ success: false, message: 'Error al crear la solicitud' });
        }
        return res.status(201).json({ success: true, message: 'Solicitud de servicio creada correctamente', orden });
      } catch (error) {
        console.error('Error clientes /me/solicitudes:', error);
        return res.status(500).json({ success: false, message: 'Error al crear la solicitud' });
      }
    }

    return res.status(404).json({ success: false, message: 'Ruta no encontrada' });
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, usuario_id, empresa, telefono, direccion, ciudad, pais, created_at, usuario:usuarios(nombre, email)')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error clientes:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener clientes' });
      }

      const clientes = (data || []).map(formatClienteUsuario);

      return res.status(200).json({ success: true, clientes });
    } catch (error) {
      console.error('Error clientes:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener clientes' });
    }
  }

  if (req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const { nombre, apellido, email, empresa, telefono, direccion, ciudad, pais } = data;

      if (!nombre || !apellido || !email || !empresa) {
        return res.status(400).json({ success: false, message: 'Datos incompletos para crear el cliente' });
      }

      const password = generateTemporaryPassword(nombre, apellido);
      const hashedPassword = await bcrypt.hash(password, 10);

      const { data: existingUser, error: checkError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (checkError) {
        console.error('Error verificando email cliente:', checkError);
        return res.status(500).json({ success: false, message: 'Error en servidor' });
      }

      if (existingUser) {
        return res.status(409).json({ success: false, message: 'El email ya está registrado' });
      }

      const nombreCompleto = `${nombre.trim()} ${apellido.trim()}`;
      let usuarioPayload = {
        nombre: nombreCompleto,
        email,
        password: hashedPassword,
        rol: 'Cliente',
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
          rol: 'Cliente',
          estado: true
        };
        ({ data: usuario, error: insertUserError } = await supabase
          .from('usuarios')
          .insert(usuarioPayload)
          .select('id')
          .single());
      }

      if (insertUserError) {
        console.error('Error creando usuario cliente:', insertUserError);
        return res.status(500).json({ success: false, message: 'Error al crear el cliente' });
      }

      const { data: cliente, error: insertClienteError } = await supabase
        .from('clientes')
        .insert({ usuario_id: usuario.id, empresa, telefono, direccion, ciudad, pais })
        .single();

      if (insertClienteError) {
        console.error('Error creando cliente:', insertClienteError);
        return res.status(500).json({ success: false, message: 'Error al crear el cliente' });
      }

      const { data: clienteFinal, error: clienteFinalError } = await supabase
        .from('clientes')
        .select('id, usuario_id, empresa, telefono, direccion, ciudad, pais, created_at, usuario:usuarios(nombre, email)')
        .eq('usuario_id', usuario.id)
        .single();

      if (clienteFinalError) {
        console.error('Error obteniendo cliente creado:', clienteFinalError);
        return res.status(500).json({ success: false, message: 'Error al obtener el cliente creado' });
      }

      const clienteConUsuario = formatClienteUsuario(clienteFinal);

      return res.status(201).json({
        success: true,
        message: 'Cliente creado correctamente',
        cliente: clienteConUsuario,
        generatedPassword: password
      });
    } catch (error) {
      console.error('Error clientes POST:', error);
      return res.status(500).json({ success: false, message: 'Error al crear clientes' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const data = await parseJsonBody(req);
      const { id, nombre, apellido, email, empresa, telefono, direccion, ciudad, pais } = data;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID es requerido para actualizar el cliente' });
      }

      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select('usuario_id')
        .eq('id', id)
        .single();

      if (clienteError || !cliente) {
        console.error('Error obteniendo cliente para actualizar:', clienteError);
        return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
      }

      if (!cliente.usuario_id) {
        console.log('[PUT /api/clientes] Cliente sin usuario_id');
        return res.status(400).json({ success: false, message: 'Cliente sin usuario asociado' });
      }

      let existingUserName = '';
      if (nombre || apellido) {
        const { data: usuarioActual, error: userFetchError } = await supabase
          .from('usuarios')
          .select('nombre')
          .eq('id', cliente.usuario_id)
          .single();

        if (userFetchError) {
          console.error('Error obteniendo usuario actual para full name:', userFetchError);
          return res.status(500).json({ success: false, message: 'Error al obtener datos del usuario' });
        }

        existingUserName = usuarioActual?.nombre || '';
      }

      const clienteUpdate = {};
      if (empresa) clienteUpdate.empresa = empresa;
      if (telefono) clienteUpdate.telefono = telefono;
      if (direccion) clienteUpdate.direccion = direccion;
      if (ciudad) clienteUpdate.ciudad = ciudad;
      if (pais) clienteUpdate.pais = pais;

      const usuarioUpdate = {};
      if (nombre || apellido) {
        const fullName = buildFullName(nombre, apellido, existingUserName);
        if (fullName) usuarioUpdate.nombre = fullName;
      }
      if (email) usuarioUpdate.email = email;

      console.log('[PUT /api/clientes] clienteUpdate:', clienteUpdate, 'usuarioUpdate:', usuarioUpdate);

      if (Object.keys(clienteUpdate).length === 0 && Object.keys(usuarioUpdate).length === 0) {
        console.log('[PUT /api/clientes] Sin cambios para actualizar');
        return res.status(400).json({ success: false, message: 'Debe proporcionar al menos un dato para actualizar' });
      }

      if (Object.keys(usuarioUpdate).length > 0) {
        console.log('[PUT /api/clientes] Actualizando usuario:', cliente.usuario_id, 'con datos:', usuarioUpdate);
        const { error: userUpdateError } = await supabase
          .from('usuarios')
          .update(usuarioUpdate)
          .eq('id', cliente.usuario_id);

        if (userUpdateError) {
          console.error('Error actualizando usuario del cliente:', userUpdateError);
          return res.status(500).json({ success: false, message: 'Error al actualizar los datos del usuario' });
        }
        console.log('[PUT /api/clientes] Usuario actualizado exitosamente');
      }

      let updatedCliente = null;
      let updateError = null;

      if (Object.keys(clienteUpdate).length > 0) {
        console.log('[PUT /api/clientes] Actualizando cliente:', id, 'con datos:', clienteUpdate);
        const result = await supabase
          .from('clientes')
          .update(clienteUpdate)
          .eq('id', id)
          .select()
          .single();
        updatedCliente = result.data;
        updateError = result.error;
        console.log('[PUT /api/clientes] Cliente actualizado:', updatedCliente, 'Error:', updateError);
      }

      if (updateError) {
        console.error('Error actualizando cliente:', updateError);
        return res.status(500).json({ success: false, message: 'Error al actualizar cliente' });
      }

      const { data: clienteFinal, error: clienteFinalError } = await supabase
        .from('clientes')
        .select('id, usuario_id, empresa, telefono, direccion, ciudad, pais, created_at, usuario:usuarios(nombre, email)')
        .eq('id', id)
        .single();

      if (clienteFinalError) {
        console.error('[PUT /api/clientes] Error obteniendo cliente final:', clienteFinalError);
        return res.status(500).json({ success: false, message: 'Error al obtener el cliente actualizado' });
      }

      const finalCliente = formatClienteUsuario(clienteFinal);

      console.log('[PUT /api/clientes] Cliente final retornado:', finalCliente);

      return res.status(200).json({
        success: true,
        message: 'Cliente actualizado correctamente',
        cliente: finalCliente
      });
    } catch (error) {
      console.error('Error clientes PUT:', error);
      return res.status(500).json({ success: false, message: 'Error al actualizar cliente' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const data = await parseJsonBody(req);
      const { id } = data;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID es requerido' });
      }

      const { data: cliente, error: selectError } = await supabase
        .from('clientes')
        .select('usuario_id')
        .eq('id', id)
        .single();

      if (selectError) {
        return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
      }

      const { error: deleteClienteError } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (deleteClienteError) {
        console.error('Error eliminando cliente:', deleteClienteError);
        return res.status(500).json({ success: false, message: 'Error al eliminar cliente' });
      }

      if (cliente.usuario_id) {
        await supabase.from('usuarios').delete().eq('id', cliente.usuario_id);
      }

      return res.status(200).json({
        success: true,
        message: 'Cliente eliminado correctamente'
      });
    } catch (error) {
      console.error('Error clientes DELETE:', error);
      return res.status(500).json({ success: false, message: 'Error al eliminar cliente' });
    }
  }

  return res.status(405).json({ success: false, message: 'Método no permitido' });
};
