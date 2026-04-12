const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan las variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// GET /api/debug/usuarios - Ver todos los usuarios (SOLO PARA DEBUG)
router.get('/usuarios', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, email, nombre, rol, estado')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching usuarios:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener usuarios', error });
    }

    return res.status(200).json({ success: true, usuarios: data || [] });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: 'Error en servidor', error: error.message });
  }
});

// POST /api/debug/fix-passwords - Actualizar contraseñas (SOLO LOCALHOST)
router.post('/fix-passwords', async (req, res) => {
  const remoteIp = req.ip || req.connection.remoteAddress;
  const isLocalhost = remoteIp === '127.0.0.1' || remoteIp === '::1' || remoteIp?.includes('localhost');
  
  if (!isLocalhost) {
    return res.status(403).json({ success: false, message: 'Acceso denegado. Solo desde localhost.' });
  }

  try {
    const hashedPasswords = {
      'admin@climatizacion.com': '$2a$10$FFqWR4QY1Lj9bMhKVqjus.OoKuDjGu3r9L.DB/eOoC.gHBBD0Y4l.',
      'tecnico@climatizacion.com': '$2a$10$yFDC1NUH.YnhLi9p/bRTj.W3r/SmTa1GMjQVMEcJ5FEoGkvYyGxx.',
      'cliente@example.com': '$2a$10$7rMhCFAM9LLs4YvIYoNXCuy6cs8.t2t3rGSHpsOOtEjXtT7pvo/mG'
    };

    const updates = [];
    for (const [email, password] of Object.entries(hashedPasswords)) {
      const { error } = await supabase
        .from('usuarios')
        .update({ password })
        .eq('email', email);
      
      if (error) {
        console.error(`Error updating ${email}:`, error);
        updates.push({ email, success: false, error: error.message });
      } else {
        updates.push({ email, success: true });
      }
    }

    return res.status(200).json({ success: true, message: 'Contraseñas actualizadas', updates });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: 'Error en servidor', error: error.message });
  }
});

module.exports = router;
