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