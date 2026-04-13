const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan las variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

router.get('/', verifyToken, async (req, res) => {
  try {
    const tables = [
      { name: 'clientes', key: 'clientes' },
      { name: 'equipos_climatizacion', key: 'equipos' },
      { name: 'tecnicos', key: 'tecnicos' },
      { name: 'ordenes_mantenimiento', key: 'ordenes' },
      { name: 'cotizaciones', key: 'cotizaciones' }
    ];

    const counts = {};
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
});

module.exports = router;
