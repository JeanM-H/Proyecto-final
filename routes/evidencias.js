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
    const evidenciaId = Number(req.params.id);
    const userId = req.user.id;
    const userRol = req.user.rol;

    // Verificar que la evidencia existe y pertenece al técnico
    const { data: evidencia, error: selectError } = await supabase
      .from('evidencias')
      .select(`
        mantenimiento_id,
        mantenimientos:mantenimiento_id (
          tecnico_id
        )
      `)
      .eq('id', evidenciaId)
      .single();

    if (selectError || !evidencia) {
      return res.status(404).json({ success: false, message: 'Evidencia no encontrada' });
    }

    // Verificar permisos
    if (userRol !== 'Administrador') {
      const { data: tecnico, error: tecnicoError } = await supabase
        .from('tecnicos')
        .select('id')
        .eq('usuario_id', userId)
        .single();

      if (tecnicoError || !tecnico || tecnico.id !== evidencia.mantenimientos.tecnico_id) {
        return res.status(403).json({ success: false, message: 'No autorizado para eliminar esta evidencia' });
      }
    }

    const { error } = await supabase
      .from('evidencias')
      .delete()
      .eq('id', evidenciaId);

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