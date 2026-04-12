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

async function getTechnicianByUserId(userId) {
  const { data, error } = await supabase
    .from('tecnicos')
    .select('id, usuario_id')
    .eq('usuario_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mantenimientos')
      .select('id, orden_id, tecnico_id, notas, tiempo_dedicado, repuestos_utilizados, fecha_inicio, fecha_fin, observaciones, created_at, orden:ordenes_mantenimiento(descripcion,estado), tecnico:tecnicos(usuario:usuarios(nombre, email)))')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error mantenimientos:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener mantenimientos' });
    }

    return res.status(200).json({ success: true, mantenimientos: data || [] });
  } catch (error) {
    console.error('Error mantenimientos:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener mantenimientos' });
  }
});

router.get('/tecnico/:tecnico_id', verifyToken, async (req, res) => {
  try {
    const tecnicoId = Number(req.params.tecnico_id);
    const { data, error } = await supabase
      .from('mantenimientos')
      .select('id, orden_id, tecnico_id, notas, tiempo_dedicado, repuestos_utilizados, fecha_inicio, fecha_fin, observaciones, created_at, orden:ordenes_mantenimiento(descripcion,estado), tecnico:tecnicos(usuario:usuarios(nombre, email)))')
      .eq('tecnico_id', tecnicoId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error mantenimientos tecnico:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener mantenimientos del técnico' });
    }

    return res.status(200).json({ success: true, mantenimientos: data || [] });
  } catch (error) {
    console.error('Error mantenimientos tecnico:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener mantenimientos del técnico' });
  }
});

router.get('/orden/:orden_id', verifyToken, async (req, res) => {
  try {
    const ordenId = Number(req.params.orden_id);
    const { data, error } = await supabase
      .from('mantenimientos')
      .select('id, orden_id, tecnico_id, notas, tiempo_dedicado, repuestos_utilizados, fecha_inicio, fecha_fin, observaciones, created_at, orden:ordenes_mantenimiento(descripcion,estado), tecnico:tecnicos(usuario:usuarios(nombre, email)))')
      .eq('orden_id', ordenId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error mantenimientos orden:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener mantenimientos de la orden' });
    }

    return res.status(200).json({ success: true, mantenimientos: data || [] });
  } catch (error) {
    console.error('Error mantenimientos orden:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener mantenimientos de la orden' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const mantenimientoId = Number(req.params.id);
    const { data, error } = await supabase
      .from('mantenimientos')
      .select('id, orden_id, tecnico_id, notas, tiempo_dedicado, repuestos_utilizados, fecha_inicio, fecha_fin, observaciones, created_at, orden:ordenes_mantenimiento(descripcion,estado), tecnico:tecnicos(usuario:usuarios(nombre, email)))')
      .eq('id', mantenimientoId)
      .maybeSingle();

    if (error) {
      console.error('Error mantenimiento detalle:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener mantenimiento' });
    }

    if (!data) {
      return res.status(404).json({ success: false, message: 'Mantenimiento no encontrado' });
    }

    return res.status(200).json({ success: true, mantenimiento: data });
  } catch (error) {
    console.error('Error mantenimiento detalle:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener mantenimiento' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const tecnico = await getTechnicianByUserId(req.user.id);
    if (!tecnico) {
      return res.status(404).json({ success: false, message: 'Técnico no encontrado' });
    }

    const {
      orden_id,
      notas,
      tiempo_dedicado,
      repuestos_utilizados,
      fecha_inicio,
      fecha_fin,
      observaciones
    } = req.body;

    if (!orden_id || !notas || !tiempo_dedicado) {
      return res.status(400).json({ success: false, message: 'Orden, notas y tiempo dedicado son requeridos' });
    }

    const insertData = {
      orden_id,
      tecnico_id: tecnico.id,
      notas,
      tiempo_dedicado,
      repuestos_utilizados: repuestos_utilizados || null,
      fecha_inicio: fecha_inicio || new Date().toISOString(),
      fecha_fin: fecha_fin || null,
      observaciones: observaciones || null
    };

    const { data, error } = await supabase
      .from('mantenimientos')
      .insert(insertData)
      .single();

    if (error) {
      console.error('Error creando mantenimiento:', error);
      return res.status(500).json({ success: false, message: 'Error al crear mantenimiento' });
    }

    const ordenUpdates = {
      estado: fecha_fin ? 'Completada' : 'En Progreso'
    };

    if (fecha_fin) {
      ordenUpdates.fecha_completada = fecha_fin;
    }

    await supabase
      .from('ordenes_mantenimiento')
      .update(ordenUpdates)
      .eq('id', orden_id);

    return res.status(201).json({ success: true, mantenimiento: data });
  } catch (error) {
    console.error('Error mantenimientos POST:', error);
    return res.status(500).json({ success: false, message: 'Error al registrar mantenimiento' });
  }
});

module.exports = router;
