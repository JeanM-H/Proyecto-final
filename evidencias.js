const supabase = require('./supabaseClient');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-please-change-in-vercel';

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function getAuthToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const id = pathname.split('/').pop();

    // Verificar autenticación
    const token = getAuthToken(req);
    const decoded = token ? verifyToken(token) : null;

    if (!decoded) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    // GET /api/evidencias - Obtener todas las evidencias
    if (req.method === 'GET' && pathname === '/api/evidencias') {
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
        return res.status(500).json({ success: false, message: error.message });
      }
      return res.status(200).json({ success: true, data });
    }

    // GET /api/evidencias/mantenimiento/:id - Obtener evidencias de un mantenimiento
    if (req.method === 'GET' && pathname.includes('/mantenimiento/')) {
      const maintId = parseInt(id);
      const { data, error } = await supabase
        .from('evidencias')
        .select('*')
        .eq('mantenimiento_id', maintId)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }
      return res.status(200).json({ success: true, data });
    }

    // GET /api/evidencias/:id - Obtener evidencia individual
    if (req.method === 'GET' && id !== 'evidencias' && id !== 'api' && !pathname.includes('/mantenimiento/')) {
      const { data, error } = await supabase
        .from('evidencias')
        .select('*')
        .eq('id', parseInt(id));

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, message: 'Evidencia no encontrada' });
      }

      return res.status(200).json({ success: true, data: data[0] });
    }

    // POST /api/evidencias - Crear evidencia
    if (req.method === 'POST') {
      const body = await parseJsonBody(req);

      const { mantenimiento_id, archivo_nombre, archivo_ruta, tipo, descripcion } = body;

      if (!mantenimiento_id || !archivo_nombre || !archivo_ruta || !tipo) {
        return res.status(400).json({
          success: false,
          message: 'Faltan campos requeridos: mantenimiento_id, archivo_nombre, archivo_ruta, tipo'
        });
      }

      // Validar tipo
      const tiposValidos = ['Foto', 'Documento', 'Video'];
      if (!tiposValidos.includes(tipo)) {
        return res.status(400).json({
          success: false,
          message: `Tipo inválido. Debe ser uno de: ${tiposValidos.join(', ')}`
        });
      }

      const { data, error } = await supabase
        .from('evidencias')
        .insert([
          {
            mantenimiento_id,
            archivo_nombre,
            archivo_ruta,
            tipo,
            descripcion: descripcion || null
          }
        ])
        .select();

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.status(201).json({
        success: true,
        message: 'Evidencia registrada correctamente',
        data: data[0]
      });
    }

    // PUT /api/evidencias/:id - Actualizar evidencia
    if (req.method === 'PUT' && id !== 'evidencias' && id !== 'api') {
      const body = await parseJsonBody(req);

      const { descripcion, tipo } = body;
      const updateData = {};

      if (descripcion !== undefined) updateData.descripcion = descripcion;
      if (tipo !== undefined) updateData.tipo = tipo;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay campos para actualizar'
        });
      }

      const { data, error } = await supabase
        .from('evidencias')
        .update(updateData)
        .eq('id', parseInt(id))
        .select();

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ success: false, message: 'Evidencia no encontrada' });
      }

      return res.status(200).json({
        success: true,
        message: 'Evidencia actualizada correctamente',
        data: data[0]
      });
    }

    // DELETE /api/evidencias/:id - Eliminar evidencia
    if (req.method === 'DELETE' && id !== 'evidencias' && id !== 'api') {
      // Primero obtener la evidencia para eliminar del storage
      const { data: evidency, error: getError } = await supabase
        .from('evidencias')
        .select('archivo_ruta')
        .eq('id', parseInt(id))
        .single();

      if (getError || !evidency) {
        return res.status(404).json({ success: false, message: 'Evidencia no encontrada' });
      }

      // Eliminar del storage
      if (evidency.archivo_ruta) {
        const pathParts = evidency.archivo_ruta.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const bucket = pathParts[0];

        await supabase.storage.from(bucket).remove([fileName]);
      }

      // Eliminar del registro en base de datos
      const { error: deleteError } = await supabase
        .from('evidencias')
        .delete()
        .eq('id', parseInt(id));

      if (deleteError) {
        return res.status(500).json({ success: false, message: deleteError.message });
      }

      return res.status(200).json({
        success: true,
        message: 'Evidencia eliminada correctamente'
      });
    }

    return res.status(404).json({ success: false, message: 'Ruta no encontrada' });
  } catch (error) {
    console.error('Error en evidencias API:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en la API de evidencias',
      detail: error.message
    });
  }
};
