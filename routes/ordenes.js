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

router.get('/', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ordenes_mantenimiento')
      .select('id, cliente_id, equipo_id, tecnico_id, tipo, descripcion, estado, fecha_programada, fecha_completada, created_at, cliente:clientes(empresa), equipo:equipos_climatizacion(modelo,marca), tecnico:tecnicos(especialidad)')
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
});

router.get('/assigned', verifyToken, async (req, res) => {
  try {
    const tecnico = await getTechnicianByUserId(req.user.id);

    if (!tecnico) {
      return res.status(404).json({ success: false, message: 'Técnico no encontrado' });
    }

    const { data, error } = await supabase
      .from('ordenes_mantenimiento')
      .select('id, cliente_id, equipo_id, tecnico_id, tipo, descripcion, estado, fecha_programada, fecha_completada, created_at, cliente:clientes(empresa), equipo:equipos_climatizacion(modelo,marca), tecnico:tecnicos(especialidad)')
      .eq('tecnico_id', tecnico.id)
      .order('fecha_programada', { ascending: true });

    if (error) {
      console.error('Error ordenes asignadas:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener órdenes asignadas' });
    }

    return res.status(200).json({ success: true, ordenes: data || [], tecnico_id: tecnico.id });
  } catch (error) {
    console.error('Error ordenes assigned:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener órdenes asignadas' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const ordenId = Number(req.params.id);

    const { data, error } = await supabase
      .from('ordenes_mantenimiento')
      .select('id, cliente_id, equipo_id, tecnico_id, tipo, descripcion, estado, fecha_programada, fecha_completada, created_at, cliente:clientes(empresa), equipo:equipos_climatizacion(modelo,marca), tecnico:tecnicos(especialidad)')
      .eq('id', ordenId)
      .maybeSingle();

    if (error) {
      console.error('Error orden detalle:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener orden' });
    }

    if (!data) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    return res.status(200).json({ success: true, orden: data });
  } catch (error) {
    console.error('Error orden detalle:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener orden' });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const ordenId = Number(req.params.id);
    const userId = req.user.id;
    const userRol = req.user.rol;
    const { estado, fecha_completada, cliente_id, equipo_id, tecnico_id, tipo, descripcion, fecha_programada } = req.body;

    // Verificar que la orden existe
    const { data: orden, error: selectError } = await supabase
      .from('ordenes_mantenimiento')
      .select('tecnico_id')
      .eq('id', ordenId)
      .single();

    if (selectError || !orden) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    // Verificar permisos: técnico solo si asignado, admin todos
    if (userRol !== 'Administrador') {
      const tecnico = await getTechnicianByUserId(userId);
      if (!tecnico || tecnico.id !== orden.tecnico_id) {
        return res.status(403).json({ success: false, message: 'No autorizado para actualizar esta orden' });
      }
    }

    const updates = {};
    if (estado) updates.estado = estado;
    if (fecha_completada) updates.fecha_completada = fecha_completada;
    if (cliente_id) updates.cliente_id = cliente_id;
    if (equipo_id) updates.equipo_id = equipo_id;
    if (tecnico_id) updates.tecnico_id = tecnico_id;
    if (tipo) updates.tipo = tipo;
    if (descripcion) updates.descripcion = descripcion;
    if (fecha_programada) updates.fecha_programada = fecha_programada;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }

    updates.updated_by = req.user.id;

    const { data, error } = await supabase
      .from('ordenes_mantenimiento')
      .update(updates)
      .eq('id', ordenId)
      .single();

    if (error) {
      console.error('Error actualizando orden:', error);
      return res.status(500).json({ success: false, message: 'Error al actualizar la orden' });
    }

    return res.status(200).json({ success: true, orden: data });
  } catch (error) {
    console.error('Error orden PUT:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar la orden' });
  }
});

router.delete('/:id', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const ordenId = Number(req.params.id);

    const { error } = await supabase
      .from('ordenes_mantenimiento')
      .delete()
      .eq('id', ordenId);

    if (error) {
      console.error('Error eliminando orden:', error);
      return res.status(500).json({ success: false, message: 'Error al eliminar la orden' });
    }

    return res.status(200).json({ success: true, message: 'Orden eliminada correctamente' });
  } catch (error) {
    console.error('Error orden DELETE:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar la orden' });
  }
});

router.post('/', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const { cliente_id, equipo_id, tecnico_id, tipo, descripcion, fecha_programada } = req.body;

    if (!cliente_id || !equipo_id || !tecnico_id || !tipo || !descripcion) {
      return res.status(400).json({ success: false, message: 'Datos incompletos para crear la orden' });
    }

    const { data, error } = await supabase
      .from('ordenes_mantenimiento')
      .insert({ cliente_id, equipo_id, tecnico_id, tipo, descripcion, fecha_programada, estado: 'Pendiente', created_by: req.user.id })
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
});

module.exports = router;
