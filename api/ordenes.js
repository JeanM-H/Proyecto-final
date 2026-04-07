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

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('ordenes_mantenimiento')
        .select('id, cliente_id, equipo_id, tecnico_id, tipo, descripcion, estado, fecha_programada, fecha_completada, created_at, updated_at, cliente:clientes(empresa), equipo:equipos_climatizacion(modelo,marca), tecnico:tecnicos(especialidad)')
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