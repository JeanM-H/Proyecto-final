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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const resourceId = pathParts.length === 3 ? Number(pathParts[2]) : null;

  if (req.method === 'GET') {
    try {
      if (resourceId) {
        const { data, error } = await supabase
          .from('equipos_climatizacion')
          .select('id, cliente_id, marca, modelo, serial, tipo, fecha_instalacion, ubicacion, estado, created_at, cliente:clientes(empresa)')
          .eq('id', resourceId)
          .single();

        if (error) {
          console.error('Error equipo individual:', error);
          return res.status(500).json({ success: false, message: 'Error al obtener el equipo' });
        }

        return res.status(200).json({ success: true, equipo: data });
      }

      const { data, error } = await supabase
        .from('equipos_climatizacion')
        .select('id, cliente_id, marca, modelo, serial, tipo, fecha_instalacion, ubicacion, estado, created_at, cliente:clientes(empresa)')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error equipos:', error);
        return res.status(500).json({ success: false, message: 'Error al obtener equipos' });
      }

      return res.status(200).json({ success: true, equipos: data || [] });
    } catch (error) {
      console.error('Error equipos:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener equipos' });
    }
  }

  if (req.method === 'PUT') {
    try {
      if (!resourceId) {
        return res.status(400).json({ success: false, message: 'ID del equipo es requerido' });
      }

      const payload = await parseJsonBody(req);
      const { cliente_id, marca, modelo, serial, tipo, fecha_instalacion, ubicacion, estado } = payload;
      const updatePayload = {};
      if (cliente_id) updatePayload.cliente_id = cliente_id;
      if (marca) updatePayload.marca = marca;
      if (modelo) updatePayload.modelo = modelo;
      if (serial) updatePayload.serial = serial;
      if (tipo) updatePayload.tipo = tipo;
      if (fecha_instalacion !== undefined) updatePayload.fecha_instalacion = fecha_instalacion;
      if (ubicacion !== undefined) updatePayload.ubicacion = ubicacion;
      if (estado !== undefined) updatePayload.estado = estado;

      if (Object.keys(updatePayload).length === 0) {
        return res.status(400).json({ success: false, message: 'Debe enviar al menos un campo para actualizar' });
      }

      const { data, error } = await supabase
        .from('equipos_climatizacion')
        .update(updatePayload)
        .eq('id', resourceId)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando equipo:', error);
        return res.status(500).json({ success: false, message: 'Error al actualizar el equipo' });
      }

      return res.status(200).json({ success: true, message: 'Equipo actualizado correctamente', equipo: data });
    } catch (error) {
      console.error('Error equipos PUT:', error);
      return res.status(500).json({ success: false, message: 'Error al actualizar el equipo' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      if (!resourceId) {
        return res.status(400).json({ success: false, message: 'ID del equipo es requerido' });
      }

      const { data: equipo, error: selectError } = await supabase
        .from('equipos_climatizacion')
        .select('id')
        .eq('id', resourceId)
        .single();

      if (selectError || !equipo) {
        console.error('Error buscando equipo para eliminar:', selectError);
        return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
      }

      const { error: deleteError } = await supabase
        .from('equipos_climatizacion')
        .delete()
        .eq('id', resourceId);

      if (deleteError) {
        console.error('Error eliminando equipo:', deleteError);
        return res.status(500).json({ success: false, message: 'Error al eliminar el equipo' });
      }

      return res.status(200).json({ success: true, message: 'Equipo eliminado correctamente' });
    } catch (error) {
      console.error('Error equipos DELETE:', error);
      return res.status(500).json({ success: false, message: 'Error al eliminar el equipo' });
    }
  }

  if (req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const { cliente_id, marca, modelo, serial, tipo, fecha_instalacion, ubicacion, estado } = payload;

      if (!cliente_id || !marca || !modelo || !serial || !tipo) {
        return res.status(400).json({ success: false, message: 'Datos incompletos para crear el equipo' });
      }

      const { data, error } = await supabase
        .from('equipos_climatizacion')
        .insert({ cliente_id, marca, modelo, serial, tipo, fecha_instalacion, ubicacion, estado: estado || 'Activo' })
        .single();

      if (error) {
        console.error('Error creando equipo:', error);
        return res.status(500).json({ success: false, message: 'Error al crear el equipo' });
      }

      return res.status(201).json({ success: true, equipo: data });
    } catch (error) {
      console.error('Error equipos POST:', error);
      return res.status(500).json({ success: false, message: 'Error al crear el equipo' });
    }
  }

  return res.status(405).json({ success: false, message: 'Método no permitido' });
};