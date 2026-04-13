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
      .from('evidencias')
      .select(`
        *,
        mantenimientos:mantenimiento_id (
          id,
          orden_id,
          notas,
          tecnico_id,
          tecnicos:tecnico_id (
            id,
            usuario_id,
            usuarios:usuario_id (nombre)
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error evidencias:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error evidencias:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener evidencias' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { mantenimiento_id, archivo_nombre, archivo_ruta, tipo, descripcion } = req.body;

    if (!mantenimiento_id || !archivo_nombre || !tipo) {
      return res.status(400).json({ success: false, message: 'Mantenimiento ID, archivo nombre y tipo son requeridos' });
    }

    const { data, error } = await supabase
      .from('evidencias')
      .insert({
        mantenimiento_id,
        archivo_nombre,
        archivo_ruta: archivo_ruta || null,
        tipo,
        descripcion: descripcion || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando evidencia:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(201).json({ success: true, evidencia: data });
  } catch (error) {
    console.error('Error evidencias POST:', error);
    return res.status(500).json({ success: false, message: 'Error al crear evidencia' });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('evidencias')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando evidencia:', error);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, message: 'Evidencia eliminada' });
  } catch (error) {
    console.error('Error eliminando evidencia:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar evidencia' });
  }
});

module.exports = router;