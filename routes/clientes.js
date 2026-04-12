const express = require('express');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function generateTemporaryPassword(nombre, apellido) {
  const base = `${nombre || ''}${apellido || ''}`
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8) || 'usuario';
  const digits = Math.floor(100 + Math.random() * 900);
  return `${base}${digits}`;
}

// GET /api/clientes
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, usuario_id, empresa, telefono, direccion, ciudad, pais, created_at, usuario:usuarios(nombre, email)')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error clientes:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener clientes' });
    }

    return res.status(200).json({ success: true, clientes: data || [] });
  } catch (error) {
    console.error('Error clientes:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener clientes' });
  }
});

// POST /api/clientes
router.post('/', verifyToken, async (req, res) => {
  try {
    const { nombre, apellido, email, empresa, telefono, direccion, ciudad, pais } = req.body;

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
    const { data: usuario, error: insertUserError } = await supabase
      .from('usuarios')
      .insert({
        nombre: nombreCompleto,
        email,
        password: hashedPassword,
        rol: 'Cliente',
        estado: true
      })
      .select('id')
      .single();

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

    return res.status(201).json({
      success: true,
      message: 'Cliente creado correctamente',
      cliente,
      generatedPassword: password
    });
  } catch (error) {
    console.error('Error clientes POST:', error);
    return res.status(500).json({ success: false, message: 'Error al crear clientes' });
  }
});

// PUT /api/clientes
router.put('/', verifyToken, async (req, res) => {
  try {
    const { id, nombre, apellido, email, empresa, telefono, direccion, ciudad, pais } = req.body;

    console.log('[PUT /api/clientes] Datos recibidos:', { id, nombre, apellido, email, empresa, telefono, direccion, ciudad, pais });

    if (!id || !empresa) {
      console.log('[PUT /api/clientes] Validación fallida - ID o empresa vacíos');
      return res.status(400).json({ success: false, message: 'ID y empresa son requeridos' });
    }

    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('usuario_id')
      .eq('id', id)
      .single();

    console.log('[PUT /api/clientes] Cliente encontrado:', cliente, 'Error:', clienteError);

    if (clienteError || !cliente) {
      console.error('Error obteniendo cliente para actualizar:', clienteError);
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    if (!cliente.usuario_id) {
      console.log('[PUT /api/clientes] Cliente sin usuario_id');
      return res.status(400).json({ success: false, message: 'Cliente sin usuario asociado' });
    }

    const clienteUpdate = {};
    if (empresa) clienteUpdate.empresa = empresa;
    if (telefono) clienteUpdate.telefono = telefono;
    if (direccion) clienteUpdate.direccion = direccion;
    if (ciudad) clienteUpdate.ciudad = ciudad;
    if (pais) clienteUpdate.pais = pais;

    const usuarioUpdate = {};
    if (nombre) usuarioUpdate.nombre = nombre;
    if (apellido) usuarioUpdate.apellido = apellido;
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

    const { data: clienteFinal } = await supabase
      .from('clientes')
      .select('id, usuario_id, empresa, telefono, direccion, ciudad, pais, created_at, usuario:usuarios(nombre, email)')
      .eq('id', id)
      .single();

    console.log('[PUT /api/clientes] Cliente final retornado:', clienteFinal);

    return res.status(200).json({
      success: true,
      message: 'Cliente actualizado correctamente',
      cliente: clienteFinal || updatedCliente
    });
  } catch (error) {
    console.error('Error clientes PUT:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar cliente' });
  }
});

// DELETE /api/clientes
router.delete('/', verifyToken, async (req, res) => {
  try {
    const { id } = req.body;

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
});

// GET /api/clientes/me - Obtener información del cliente actual
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('clientes')
      .select('id, usuario_id, empresa, telefono, direccion, ciudad, pais, created_at, usuario:usuarios(nombre, email)')
      .eq('usuario_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo cliente actual:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener información del cliente' });
    }

    if (!data) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    return res.status(200).json({ success: true, cliente: data });
  } catch (error) {
    console.error('Error clientes /me:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener información del cliente' });
  }
});

// GET /api/clientes/me/ordenes - Obtener órdenes del cliente actual
router.get('/me/ordenes', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Primero obtener el cliente_id del usuario actual
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id')
      .eq('usuario_id', userId)
      .maybeSingle();

    if (clienteError || !cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    const { data, error } = await supabase
      .from('ordenes_mantenimiento')
      .select('id, equipo_id, tecnico_id, tipo, descripcion, estado, fecha_programada, fecha_completada, created_at, updated_at, equipo:equipos_climatizacion(modelo,marca,serial,tipo), tecnico:tecnicos(especialidad)')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo órdenes del cliente:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener órdenes' });
    }

    return res.status(200).json({ success: true, ordenes: data || [] });
  } catch (error) {
    console.error('Error clientes /me/ordenes:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener órdenes' });
  }
});

// GET /api/clientes/me/cotizaciones - Obtener cotizaciones del cliente actual
router.get('/me/cotizaciones', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Primero obtener el cliente_id del usuario actual
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id')
      .eq('usuario_id', userId)
      .maybeSingle();

    if (clienteError || !cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    const { data, error } = await supabase
      .from('cotizaciones')
      .select('id, descripcion, monto_estimado, estado, fecha_solicitud, fecha_respuesta, created_at')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo cotizaciones del cliente:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener cotizaciones' });
    }

    return res.status(200).json({ success: true, cotizaciones: data || [] });
  } catch (error) {
    console.error('Error clientes /me/cotizaciones:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener cotizaciones' });
  }
});

// GET /api/clientes/me/equipos - Obtener equipos del cliente actual
router.get('/me/equipos', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Primero obtener el cliente_id del usuario actual
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id')
      .eq('usuario_id', userId)
      .maybeSingle();

    if (clienteError || !cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    const { data, error } = await supabase
      .from('equipos_climatizacion')
      .select('id, marca, modelo, serial, tipo, estado, fecha_instalacion, ubicacion, created_at')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo equipos del cliente:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener equipos' });
    }

    return res.status(200).json({ success: true, equipos: data || [] });
  } catch (error) {
    console.error('Error clientes /me/equipos:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener equipos' });
  }
});

// POST /api/clientes/me/solicitudes - Crear nueva solicitud de servicio
router.post('/me/solicitudes', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { equipo_id, tipo, descripcion, fecha_deseada } = req.body;

    if (!equipo_id || !tipo || !descripcion) {
      return res.status(400).json({ success: false, message: 'Equipo, tipo y descripción son requeridos' });
    }

    // Verificar que el equipo pertenece al cliente
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id')
      .eq('usuario_id', userId)
      .maybeSingle();

    if (clienteError || !cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
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

    const { data, error } = await supabase
      .from('ordenes_mantenimiento')
      .insert({
        cliente_id: cliente.id,
        equipo_id: equipo_id,
        tipo: tipo,
        descripcion: descripcion,
        estado: 'Pendiente',
        fecha_programada: fecha_deseada || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando solicitud:', error);
      return res.status(500).json({ success: false, message: 'Error al crear la solicitud' });
    }

    return res.status(201).json({
      success: true,
      message: 'Solicitud de servicio creada correctamente',
      orden: data
    });
  } catch (error) {
    console.error('Error clientes /me/solicitudes:', error);
    return res.status(500).json({ success: false, message: 'Error al crear la solicitud' });
  }
});

module.exports = router;