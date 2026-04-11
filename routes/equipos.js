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
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { cliente_id, marca, modelo, serial, tipo, fecha_instalacion, ubicacion, estado } = req.body;

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
});

module.exports = router;
