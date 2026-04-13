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
  const cotizacionId = pathSegments.length >= 3 ? Number(pathSegments[2]) : null;

  if (req.method === 'GET' && cotizacionId) {
    try {
      const { data, error } = await supabase
        .from('cotizaciones')
        .select('id, cliente_id, descripcion, monto_estimado, estado, fecha_solicitud, fecha_respuesta, created_at, cliente:clientes(empresa)')
        .eq('id', cotizacionId)
        .maybeSingle();

      if (error) {
        console.error('Error cotización detalle:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener cotización' });
      }

      if (!data) {
        return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
      }

      return res.status(200).json({ success: true, cotizacion: data });
    } catch (error) {
      console.error('Error cotización detalle:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener cotización' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const payload = await parseJsonBody(req);
      const idToUpdate = cotizacionId || Number(payload.id);
      let { cliente_id, descripcion, monto_estimado, estado } = payload;

      if (!idToUpdate) {
        return res.status(400).json({ success: false, message: 'ID de cotización inválido' });
      }

      const updates = {};
      if (cliente_id) updates.cliente_id = cliente_id;
      if (descripcion) updates.descripcion = descripcion;
      if (monto_estimado !== undefined) updates.monto_estimado = monto_estimado;
      if (estado) updates.estado = estado;
      if (estado && estado !== 'Pendiente') updates.fecha_respuesta = new Date().toISOString();

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
      }

      const { data, error } = await supabase
        .from('cotizaciones')
        .update(updates)
        .eq('id', idToUpdate)
        .single();

      if (error) {
        console.error('Error actualizando cotización:', error);
        return res.status(500).json({ success: false, message: 'Error al actualizar la cotización' });
      }

      return res.status(200).json({ success: true, cotizacion: data });
    } catch (error) {
      console.error('Error cotizaciones PUT:', error);
      return res.status(500).json({ success: false, message: 'Error al actualizar la cotización' });
    }
  }

  if (req.method === 'DELETE' && cotizacionId) {
    try {
      const { error } = await supabase
        .from('cotizaciones')
        .delete()
        .eq('id', cotizacionId);

      if (error) {
        console.error('Error eliminando cotización:', error);
        return res.status(500).json({ success: false, message: 'Error al eliminar la cotización' });
      }

      return res.status(200).json({ success: true, message: 'Cotización eliminada correctamente' });
    } catch (error) {
      console.error('Error cotización DELETE:', error);
      return res.status(500).json({ success: false, message: 'Error al eliminar la cotización' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('cotizaciones')
        .select('id, cliente_id, descripcion, monto_estimado, estado, fecha_solicitud, fecha_respuesta, created_at, cliente:clientes(empresa)')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error cotizaciones:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener cotizaciones' });
      }

      return res.status(200).json({ success: true, cotizaciones: data || [] });
    } catch (error) {
      console.error('Error cotizaciones:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener cotizaciones' });
    }
  }

  if (req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const { cliente_id, descripcion, monto_estimado } = payload;

      if (!cliente_id || !descripcion || !monto_estimado) {
        return res.status(400).json({ success: false, message: 'Datos incompletos para crear la cotización' });
      }

      const { data, error } = await supabase
        .from('cotizaciones')
        .insert({ cliente_id, descripcion, monto_estimado, estado: 'Pendiente', fecha_solicitud: new Date().toISOString() })
        .single();

      if (error) {
        console.error('Error creando cotización:', error);
        return res.status(500).json({ success: false, message: 'Error al crear la cotización' });
      }

      return res.status(201).json({ success: true, cotizacion: data });
    } catch (error) {
      console.error('Error cotizaciones POST:', error);
      return res.status(500).json({ success: false, message: 'Error al crear la cotización' });
    }
  }

  return res.status(405).json({ success: false, message: 'Método no permitido' });
};