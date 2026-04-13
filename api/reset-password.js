const supabase = require('./supabaseClient');
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

  if (req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const { email, role, recovery_code, new_password } = payload;

      if (!email || !role || !recovery_code || !new_password) {
        return res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });
      }

      if (new_password.length < 8) {
        return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
      }

      // Determinar tabla según el rol
      const table = role === 'Técnico' ? 'tecnicos' : role === 'Cliente' ? 'clientes' : null;
      if (!table) {
        return res.status(400).json({ success: false, message: 'Rol inválido' });
      }

      // Buscar usuario
      const { data: user, error: searchError } = await supabase
        .from(table)
        .select('id, nombre, email, recovery_code, recovery_code_expires_at')
        .eq('email', email)
        .maybeSingle();

      if (searchError) {
        console.error('Error buscando usuario:', searchError);
        return res.status(500).json({ success: false, message: 'Error al procesar solicitud' });
      }

      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      // Validar código de recuperación
      if (user.recovery_code !== recovery_code) {
        return res.status(401).json({ success: false, message: 'Código de recuperación inválido' });
      }

      // Validar que el código no haya expirado
      if (user.recovery_code_expires_at && new Date() > new Date(user.recovery_code_expires_at)) {
        return res.status(401).json({ success: false, message: 'El código de recuperación ha expirado' });
      }

      // Generar hash de la nueva contraseña
      const hashedPassword = await bcrypt.hash(new_password, 10);

      // Actualizar contraseña y limpiar código de recuperación
      const { error: updateError } = await supabase
        .from(table)
        .update({ 
          contrasena: hashedPassword,
          recovery_code: null,
          recovery_code_expires_at: null
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error actualizando contraseña:', updateError);
        return res.status(500).json({ success: false, message: 'Error al actualizar contraseña' });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Contraseña actualizada exitosamente. Por favor, inicia sesión con tu nueva contraseña.' 
      });
    } catch (error) {
      console.error('Error en reset-password:', error);
      return res.status(500).json({ success: false, message: 'Error del servidor' });
    }
  }

  return res.status(405).json({ success: false, message: 'Método no permitido' });
};
