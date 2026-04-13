const supabase = require('../supabaseClient');
const bcrypt = require('bcryptjs');

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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const payload = await parseJsonBody(req);
    const { email, role, recovery_code, new_password } = payload;

    if (!email || !role || !recovery_code || !new_password) {
      return res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const { data: user, error: searchError } = await supabase
      .from('usuarios')
      .select('id, nombre, email, rol')
      .eq('email', email)
      .eq('rol', role)
      .maybeSingle();

    if (searchError) {
      console.error('Error buscando usuario:', searchError);
      return res.status(500).json({ success: false, message: 'Error al procesar solicitud' });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const { data: tokenRecord, error: tokenError } = await supabase
      .from('recovery_tokens')
      .select('id, token, expires_at')
      .eq('user_id', user.id)
      .eq('token', recovery_code)
      .maybeSingle();

    if (tokenError) {
      console.error('Error buscando token de recuperación:', tokenError);
      const tokenMessage = tokenError.message && tokenError.message.includes('recovery_tokens')
        ? 'La tabla recovery_tokens no existe en la base de datos. Crea la tabla usando el SQL de migración.'
        : 'Error al validar el código de recuperación';
      return res.status(500).json({ success: false, message: tokenMessage });
    }

    if (!tokenRecord) {
      return res.status(401).json({ success: false, message: 'Código de recuperación inválido' });
    }

    if (tokenRecord.expires_at && new Date() > new Date(tokenRecord.expires_at)) {
      return res.status(401).json({ success: false, message: 'El código de recuperación ha expirado' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ password: hashedPassword })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error actualizando contraseña:', updateError);
      return res.status(500).json({ success: false, message: 'Error al actualizar contraseña' });
    }

    const { error: deleteError } = await supabase
      .from('recovery_tokens')
      .delete()
      .eq('id', tokenRecord.id);

    if (deleteError) {
      console.error('Error eliminando token de recuperación:', deleteError);
    }

    return res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente. Por favor, inicia sesión con tu nueva contraseña.'
    });
  } catch (error) {
    console.error('Error en reset-password:', error);
    return res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};
