const supabase = require('./supabaseClient');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, usuario_id, empresa, telefono, direccion, ciudad, pais, created_at')
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
};
