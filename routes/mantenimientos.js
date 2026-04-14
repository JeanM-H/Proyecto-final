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

router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('mantenimientos')
      .select('id, orden_id, tecnico_id, notas, tiempo_dedicado, repuestos_utilizados, fecha_inicio, fecha_fin, observaciones, created_at, orden:ordenes_mantenimiento(descripcion,estado), tecnico:tecnicos(usuario:usuarios(nombre, email)), detalle_repuestos(repuesto_id, cantidad, repuesto:repuestos(nombre, precio))')
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
      .select('id, orden_id, tecnico_id, notas, tiempo_dedicado, repuestos_utilizados, fecha_inicio, fecha_fin, observaciones, created_at')
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
      .select('id, orden_id, tecnico_id, notas, tiempo_dedicado, repuestos_utilizados, fecha_inicio, fecha_fin, observaciones, created_at')
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
      .select('id, orden_id, tecnico_id, notas, tiempo_dedicado, repuestos_utilizados, fecha_inicio, fecha_fin, observaciones, created_at')
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
      repuestos,
      fecha_inicio,
      fecha_fin,
      observaciones
    } = req.body;

    if (!orden_id || !notas || !tiempo_dedicado) {
      return res.status(400).json({ success: false, message: 'Orden, notas y tiempo dedicado son requeridos' });
    }

    // Verificar que la orden esté asignada al técnico
    const { data: orden, error: ordenError } = await supabase
      .from('ordenes_mantenimiento')
      .select('id, tecnico_id')
      .eq('id', orden_id)
      .eq('tecnico_id', tecnico.id)
      .maybeSingle();

    if (ordenError || !orden) {
      return res.status(403).json({ success: false, message: 'Orden no encontrada o no asignada a este técnico' });
    }

    const repuestosTexto = repuestos_utilizados ?? repuestos ?? null;

    const { data: mantenimiento, error: mantenimientoError } = await supabase
      .from('mantenimientos')
      .insert({
        orden_id,
        tecnico_id: tecnico.id,
        notas,
        tiempo_dedicado,
        repuestos_utilizados: repuestosTexto,
        fecha_inicio: fecha_inicio || new Date().toISOString(),
        fecha_fin: fecha_fin || null,
        observaciones: observaciones || null
      })
      .single();

    if (mantenimientoError) {
      console.error('Error creando mantenimiento:', mantenimientoError);
      return res.status(500).json({ success: false, message: 'Error al crear mantenimiento' });
    }

    // Actualizar estado de la orden
    const ordenUpdates = {
      estado: fecha_fin ? 'Completada' : 'En Progreso',
      fecha_completada: fecha_fin || null
    };

    const { error: ordenUpdateError } = await supabase
      .from('ordenes_mantenimiento')
      .update(ordenUpdates)
      .eq('id', orden_id);

    if (ordenUpdateError) {
      console.error('Error actualizando estado de orden:', ordenUpdateError);
      return res.status(500).json({ success: false, message: 'Mantenimiento creado, pero no se pudo actualizar el estado de la orden' });
    }

    return res.status(201).json({ success: true, mantenimiento: mantenimiento });
  } catch (error) {
    console.error('Error mantenimientos POST:', error);
    return res.status(500).json({ success: false, message: 'Error al registrar mantenimiento' });
  }
});

// PUT /api/mantenimientos/:id - Actualizar mantenimiento
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const mantenimientoId = Number(req.params.id);
    const userId = req.user.id;
    const userRol = req.user.rol;
    const { notas, tiempo_dedicado, repuestos, fecha_inicio, fecha_fin, observaciones } = req.body;

    // Verificar que el mantenimiento existe y pertenece al técnico o es admin
    const { data: mantenimiento, error: selectError } = await supabase
      .from('mantenimientos')
      .select('tecnico_id')
      .eq('id', mantenimientoId)
      .single();

    if (selectError || !mantenimiento) {
      return res.status(404).json({ success: false, message: 'Mantenimiento no encontrado' });
    }

    // Verificar permisos: técnico solo su mantenimiento, admin todos
    if (userRol !== 'Administrador') {
      const { data: tecnico, error: tecnicoError } = await supabase
        .from('tecnicos')
        .select('id')
        .eq('usuario_id', userId)
        .single();

      if (tecnicoError || !tecnico || tecnico.id !== mantenimiento.tecnico_id) {
        return res.status(403).json({ success: false, message: 'No autorizado para editar este mantenimiento' });
      }
    }

    const updates = {};
    if (notas !== undefined) updates.notas = notas;
    if (tiempo_dedicado !== undefined) updates.tiempo_dedicado = tiempo_dedicado;
    if (fecha_inicio !== undefined) updates.fecha_inicio = fecha_inicio;
    if (fecha_fin !== undefined) updates.fecha_fin = fecha_fin;
    if (observaciones !== undefined) updates.observaciones = observaciones;

    if (Object.keys(updates).length > 0) {
      updates.updated_by = req.user.id;

      const { data, error } = await supabase
        .from('mantenimientos')
        .update(updates)
        .eq('id', mantenimientoId)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando mantenimiento:', error);
        return res.status(500).json({ success: false, message: 'Error al actualizar mantenimiento' });
      }
    }

    // Actualizar repuestos si se proporcionaron
    if (repuestos !== undefined && Array.isArray(repuestos)) {
      // Eliminar repuestos existentes
      await supabase
        .from('detalle_repuestos')
        .delete()
        .eq('mantenimiento_id', mantenimientoId);

      // Crear nuevos repuestos si hay
      if (repuestos.length > 0) {
        const detalleRepuestos = repuestos.map(r => ({
          mantenimiento_id: mantenimientoId,
          repuesto_id: r.repuesto_id,
          cantidad: r.cantidad,
          created_at: new Date().toISOString()
        }));

        const { error: detalleError } = await supabase
          .from('detalle_repuestos')
          .insert(detalleRepuestos);

        if (detalleError) {
          console.error('Error actualizando detalle repuestos:', detalleError);
          return res.status(500).json({ success: false, message: 'Error al actualizar repuestos' });
        }
      }
    }

    // Obtener mantenimiento actualizado con repuestos
    const { data: mantenimientoActualizado, error: getError } = await supabase
      .from('mantenimientos')
      .select('id, orden_id, tecnico_id, notas, tiempo_dedicado, repuestos_utilizados, fecha_inicio, fecha_fin, observaciones, created_at, orden:ordenes_mantenimiento(descripcion,estado), tecnico:tecnicos(usuario:usuarios(nombre, email)), detalle_repuestos(repuesto_id, cantidad, repuesto:repuestos(nombre, precio))')
      .eq('id', mantenimientoId)
      .single();

    if (getError) {
      console.error('Error obteniendo mantenimiento actualizado:', getError);
      return res.status(500).json({ success: false, message: 'Error al obtener mantenimiento actualizado' });
    }

    return res.status(200).json({ success: true, mantenimiento: mantenimientoActualizado });
  } catch (error) {
    console.error('Error mantenimientos PUT:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar mantenimiento' });
  }
});

// DELETE /api/mantenimientos/:id - Eliminar mantenimiento
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const mantenimientoId = Number(req.params.id);
    const userId = req.user.id;
    const userRol = req.user.rol;

    // Verificar que el mantenimiento existe y pertenece al técnico o es admin
    const { data: mantenimiento, error: selectError } = await supabase
      .from('mantenimientos')
      .select('tecnico_id')
      .eq('id', mantenimientoId)
      .single();

    if (selectError || !mantenimiento) {
      return res.status(404).json({ success: false, message: 'Mantenimiento no encontrado' });
    }

    // Verificar permisos
    if (userRol !== 'Administrador') {
      const { data: tecnico, error: tecnicoError } = await supabase
        .from('tecnicos')
        .select('id')
        .eq('usuario_id', userId)
        .single();

      if (tecnicoError || !tecnico || tecnico.id !== mantenimiento.tecnico_id) {
        return res.status(403).json({ success: false, message: 'No autorizado para eliminar este mantenimiento' });
      }
    }

    const { error } = await supabase
      .from('mantenimientos')
      .delete()
      .eq('id', mantenimientoId);

    if (error) {
      console.error('Error eliminando mantenimiento:', error);
      return res.status(500).json({ success: false, message: 'Error al eliminar mantenimiento' });
    }

    return res.status(200).json({ success: true, message: 'Mantenimiento eliminado correctamente' });
  } catch (error) {
    console.error('Error mantenimientos DELETE:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar mantenimiento' });
  }
});

module.exports = router;
