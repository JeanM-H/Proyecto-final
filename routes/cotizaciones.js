const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan las variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

router.get('/', verifyToken, requireRole('Administrador'), async (req, res) => {
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

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const cotizacionId = Number(req.params.id);

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
});

router.post('/', verifyToken, requireRole('Administrador'), async (req, res) => {
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

router.put('/:id', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const cotizacionId = Number(req.params.id);
    const { estado, descripcion, monto_estimado, fecha_respuesta } = req.body;

    const updates = {};
    if (estado) updates.estado = estado;
    if (descripcion) updates.descripcion = descripcion;
    if (monto_estimado) updates.monto_estimado = monto_estimado;
    if (fecha_respuesta) updates.fecha_respuesta = fecha_respuesta;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }

    const { data, error } = await supabase
      .from('cotizaciones')
      .update(updates)
      .eq('id', cotizacionId)
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
});

router.delete('/:id', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const cotizacionId = Number(req.params.id);

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
    console.error('Error cotizaciones DELETE:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar la cotización' });
  }
});

module.exports = router;
