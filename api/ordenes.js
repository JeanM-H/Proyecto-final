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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const pathSegments = pathname.split('/').filter(Boolean);
  const ordenId = pathSegments.length >= 3 ? Number(pathSegments[2]) : null;

  if (req.method === 'GET' && ordenId) {
    try {
      const { data, error } = await supabase
        .from('ordenes_mantenimiento')
        .select('id, cliente_id, equipo_id, tecnico_id, tipo, descripcion, estado, fecha_programada, fecha_completada, created_at, cliente:clientes(empresa), equipo:equipos_climatizacion(modelo,marca), tecnico:tecnicos(especialidad)')
        .eq('id', ordenId)
        .maybeSingle();

      if (error) {
        console.error('Error orden detalle:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener orden' });
      }

      if (!data) {
        return res.status(404).json({ success: false, message: 'Orden no encontrada' });
      }

      return res.status(200).json({ success: true, orden: data });
    } catch (error) {
      console.error('Error orden detalle:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener orden' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const payload = await parseJsonBody(req);
      const idToUpdate = ordenId || Number(payload.id);
      let { cliente_id, equipo_id, tecnico_id, tipo, descripcion, fecha_programada, estado } = payload;

      if (!idToUpdate) {
        return res.status(400).json({ success: false, message: 'ID de orden inválido' });
      }

      const normalizedEstado = {
        Completada: 'Completado',
        Asignada: 'En Progreso'
      };
      if (estado && normalizedEstado[estado]) {
        estado = normalizedEstado[estado];
      }

      const updates = {};
      if (cliente_id) updates.cliente_id = cliente_id;
      if (equipo_id) updates.equipo_id = equipo_id;
      if (tecnico_id) updates.tecnico_id = tecnico_id;
      if (tipo) updates.tipo = tipo;
      if (descripcion) updates.descripcion = descripcion;
      if (fecha_programada !== undefined) updates.fecha_programada = fecha_programada;
      if (estado) updates.estado = estado;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
      }

      const { data, error } = await supabase
        .from('ordenes_mantenimiento')
        .update(updates)
        .eq('id', idToUpdate)
        .single();

      if (error) {
        console.error('Error actualizando orden:', error);
        return res.status(500).json({ success: false, message: 'Error al actualizar la orden' });
      }

      return res.status(200).json({ success: true, orden: data });
    } catch (error) {
      console.error('Error ordenes PUT:', error);
      return res.status(500).json({ success: false, message: 'Error al actualizar la orden' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('ordenes_mantenimiento')
        .select('id, cliente_id, equipo_id, tecnico_id, tipo, descripcion, estado, fecha_programada, fecha_completada, created_at, cliente:clientes(empresa), equipo:equipos_climatizacion(modelo,marca), tecnico:tecnicos(especialidad)')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error ordenes:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener órdenes' });
      }

      return res.status(200).json({ success: true, ordenes: data || [] });
    } catch (error) {
      console.error('Error ordenes:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener órdenes' });
    }
  }

  if (req.method === 'DELETE' && ordenId) {
    try {
      const { error } = await supabase
        .from('ordenes_mantenimiento')
        .delete()
        .eq('id', ordenId);

      if (error) {
        console.error('Error eliminando orden:', error);
        return res.status(500).json({ success: false, message: 'Error al eliminar la orden' });
      }

      return res.status(200).json({ success: true, message: 'Orden eliminada correctamente' });
    } catch (error) {
      console.error('Error orden DELETE:', error);
      return res.status(500).json({ success: false, message: 'Error al eliminar la orden' });
    }
  }

  if (req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const { cliente_id, equipo_id, tecnico_id, tipo, descripcion, fecha_programada } = payload;

      if (!cliente_id || !equipo_id || !tecnico_id || !tipo || !descripcion) {
        return res.status(400).json({ success: false, message: 'Datos incompletos para crear la orden' });
      }

      const { data, error } = await supabase
        .from('ordenes_mantenimiento')
        .insert({ cliente_id, equipo_id, tecnico_id, tipo, descripcion, fecha_programada, estado: 'Pendiente' })
        .single();

      if (error) {
        console.error('Error creando orden:', error);
        return res.status(500).json({ success: false, message: 'Error al crear la orden' });
      }

      return res.status(201).json({ success: true, orden: data });
    } catch (error) {
      console.error('Error ordenes POST:', error);
      return res.status(500).json({ success: false, message: 'Error al crear la orden' });
    }
  }

  return res.status(405).json({ success: false, message: 'Método no permitido' });
};