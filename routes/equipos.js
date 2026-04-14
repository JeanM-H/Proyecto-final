const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const normalizeNumber = value => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeDate = value => value === '' ? null : value;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan las variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

router.get('/', verifyToken, requireRole('Administrador'), async (req, res) => {
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

router.post('/', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const clienteId = normalizeNumber(req.body?.cliente_id);
    const { marca, modelo, serial, tipo, fecha_instalacion, ubicacion, estado } = req.body || {};

    if (!clienteId || !marca || !modelo || !serial || !tipo) {
      return res.status(400).json({ success: false, message: 'Datos incompletos para crear el equipo' });
    }

    const { data, error } = await supabase
      .from('equipos_climatizacion')
      .insert({ cliente_id: clienteId, marca, modelo, serial, tipo, fecha_instalacion: normalizeDate(fecha_instalacion), ubicacion, estado: estado || 'Activo' })
      .single();

    if (error) {
      console.error('Error creando equipo:', error);
      const message = error.code === '23505' || error.message?.includes('duplicate')
        ? 'Ya existe un equipo con ese serial.'
        : 'Error al crear el equipo';
      return res.status(500).json({ success: false, message, detail: error.message || error.details });
    }

    return res.status(201).json({ success: true, equipo: data });
  } catch (error) {
    console.error('Error equipos POST:', error);
    return res.status(500).json({ success: false, message: 'Error al crear el equipo', detail: error.message });
  }
});

router.put('/:id', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const equipoId = normalizeNumber(req.params.id);
    const clienteId = normalizeNumber(req.body?.cliente_id);
    const { marca, modelo, serial, tipo, fecha_instalacion, ubicacion, estado } = req.body || {};

    if (!equipoId || !clienteId || !marca || !modelo || !serial || !tipo) {
      return res.status(400).json({ success: false, message: 'Datos incompletos para actualizar el equipo' });
    }

    const { data, error } = await supabase
      .from('equipos_climatizacion')
      .update({ cliente_id: clienteId, marca, modelo, serial, tipo, fecha_instalacion: normalizeDate(fecha_instalacion), ubicacion, estado })
      .eq('id', equipoId)
      .single();

    if (error) {
      console.error('Error actualizando equipo:', error);
      return res.status(500).json({ success: false, message: 'Error al actualizar el equipo', detail: error.message || error.details });
    }

    return res.status(200).json({ success: true, equipo: data });
  } catch (error) {
    console.error('Error equipos PUT:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar el equipo', detail: error.message });
  }
});

router.delete('/:id', verifyToken, requireRole('Administrador'), async (req, res) => {
  try {
    const equipoId = Number(req.params.id);

    const { error } = await supabase
      .from('equipos_climatizacion')
      .delete()
      .eq('id', equipoId);

    if (error) {
      console.error('Error eliminando equipo:', error);
      return res.status(500).json({ success: false, message: 'Error al eliminar el equipo' });
    }

    return res.status(200).json({ success: true, message: 'Equipo eliminado correctamente' });
  } catch (error) {
    console.error('Error equipos DELETE:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar el equipo' });
  }
});

module.exports = router;
