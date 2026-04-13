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

// GET /api/repuestos - Obtener todos los repuestos (solo admin)
router.get('/', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('repuestos')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error repuestos:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener repuestos' });
    }

    return res.status(200).json({ success: true, repuestos: data || [] });
  } catch (error) {
    console.error('Error repuestos:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener repuestos' });
  }
});

// POST /api/repuestos - Crear repuesto (solo admin)
router.post('/', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock } = req.body;

    if (!nombre || !precio) {
      return res.status(400).json({ success: false, message: 'Nombre y precio son requeridos' });
    }

    const { data, error } = await supabase
      .from('repuestos')
      .insert({ nombre, descripcion, precio, stock, created_by: req.user.id })
      .select()
      .single();

    if (error) {
      console.error('Error creando repuesto:', error);
      return res.status(500).json({ success: false, message: 'Error al crear repuesto' });
    }

    return res.status(201).json({ success: true, repuesto: data });
  } catch (error) {
    console.error('Error repuestos POST:', error);
    return res.status(500).json({ success: false, message: 'Error al crear repuesto' });
  }
});

// PUT /api/repuestos/:id - Actualizar repuesto (solo admin)
router.put('/:id', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const repuestoId = Number(req.params.id);
    const { nombre, descripcion, precio, stock } = req.body;

    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (descripcion !== undefined) updates.descripcion = descripcion;
    if (precio !== undefined) updates.precio = precio;
    if (stock !== undefined) updates.stock = stock;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }

    updates.updated_by = req.user.id;

    const { data, error } = await supabase
      .from('repuestos')
      .update(updates)
      .eq('id', repuestoId)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando repuesto:', error);
      return res.status(500).json({ success: false, message: 'Error al actualizar repuesto' });
    }

    return res.status(200).json({ success: true, repuesto: data });
  } catch (error) {
    console.error('Error repuestos PUT:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar repuesto' });
  }
});

// DELETE /api/repuestos/:id - Eliminar repuesto (solo admin)
router.delete('/:id', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const repuestoId = Number(req.params.id);

    const { error } = await supabase
      .from('repuestos')
      .delete()
      .eq('id', repuestoId);

    if (error) {
      console.error('Error eliminando repuesto:', error);
      return res.status(500).json({ success: false, message: 'Error al eliminar repuesto' });
    }

    return res.status(200).json({ success: true, message: 'Repuesto eliminado correctamente' });
  } catch (error) {
    console.error('Error repuestos DELETE:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar repuesto' });
  }
});

module.exports = router;