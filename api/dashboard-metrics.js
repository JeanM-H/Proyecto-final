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
    const counts = {};

    const tables = [
      { name: 'clientes', key: 'clientes' },
      { name: 'equipos_climatizacion', key: 'equipos' },
      { name: 'tecnicos', key: 'tecnicos' },
      { name: 'ordenes_mantenimiento', key: 'ordenes' },
      { name: 'usuarios', key: 'usuarios' }
    ];

    await Promise.all(tables.map(async table => {
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });

      counts[table.key] = error ? 0 : count || 0;
    }));

    return res.status(200).json({ success: true, counts });
  } catch (error) {
    console.error('Error dashboard metrics:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener métricas' });
  }
};
