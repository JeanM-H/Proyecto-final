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