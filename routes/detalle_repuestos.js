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

// GET /api/detalle_repuestos - Obtener detalles de repuestos (solo admin)
router.get('/', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('detalle_repuestos')
      .select(`
        id, cantidad, created_at,
        mantenimiento:mantenimiento_id (
          id, notas, tiempo_dedicado,
          orden:orden_id (id, tipo, descripcion)
        ),
        repuesto:repuesto_id (
          id, nombre, precio
        )
      `)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error detalle_repuestos:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener detalles de repuestos' });
    }

    return res.status(200).json({ success: true, detalle_repuestos: data || [] });
  } catch (error) {
    console.error('Error detalle_repuestos:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener detalles de repuestos' });
  }
});

// POST /api/detalle_repuestos - Crear detalle de repuesto (solo admin)
router.post('/', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const { mantenimiento_id, repuesto_id, cantidad } = req.body;

    if (!mantenimiento_id || !repuesto_id || !cantidad) {
      return res.status(400).json({ success: false, message: 'Mantenimiento ID, repuesto ID y cantidad son requeridos' });
    }

    const { data, error } = await supabase
      .from('detalle_repuestos')
      .insert({ mantenimiento_id, repuesto_id, cantidad })
      .select()
      .single();

    if (error) {
      console.error('Error creando detalle_repuesto:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(201).json({ success: true, detalle_repuesto: data });
  } catch (error) {
    console.error('Error detalle_repuestos POST:', error);
    return res.status(500).json({ success: false, message: 'Error al crear detalle de repuesto' });
  }
});

// PUT /api/detalle_repuestos/:id - Actualizar detalle de repuesto (solo admin)
router.put('/:id', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const detalleId = Number(req.params.id);
    const { mantenimiento_id, repuesto_id, cantidad } = req.body;

    const updates = {};
    if (mantenimiento_id !== undefined) updates.mantenimiento_id = mantenimiento_id;
    if (repuesto_id !== undefined) updates.repuesto_id = repuesto_id;
    if (cantidad !== undefined) updates.cantidad = cantidad;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }

    const { data, error } = await supabase
      .from('detalle_repuestos')
      .update(updates)
      .eq('id', detalleId)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando detalle_repuesto:', error);
      return res.status(500).json({ success: false, message: 'Error al actualizar detalle de repuesto' });
    }

    return res.status(200).json({ success: true, detalle_repuesto: data });
  } catch (error) {
    console.error('Error detalle_repuestos PUT:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar detalle de repuesto' });
  }
});

// DELETE /api/detalle_repuestos/:id - Eliminar detalle de repuesto (solo admin)
router.delete('/:id', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const detalleId = Number(req.params.id);

    const { error } = await supabase
      .from('detalle_repuestos')
      .delete()
      .eq('id', detalleId);

    if (error) {
      console.error('Error eliminando detalle_repuesto:', error);
      return res.status(500).json({ success: false, message: 'Error al eliminar detalle de repuesto' });
    }

    return res.status(200).json({ success: true, message: 'Detalle de repuesto eliminado correctamente' });
  } catch (error) {
    console.error('Error detalle_repuestos DELETE:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar detalle de repuesto' });
  }
});

module.exports = router;