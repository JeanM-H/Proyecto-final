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
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { cliente_id, descripcion, monto_estimado } = req.body;

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
});

module.exports = router;
