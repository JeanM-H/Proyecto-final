const bcrypt = require('bcryptjs');
const supabase = require('./supabaseClient');

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
    const { email, role, currentPassword, newPassword } = payload;

    if (!email || !role || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Datos incompletos' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const { data: user, error } = await supabase
      .from('usuarios')
      .select('id, password, estado')
      .eq('email', email)
      .eq('rol', role)
      .maybeSingle();

    if (error) {
      console.error('Error cambiando contraseña:', error);
      return res.status(500).json({ success: false, message: 'Error en servidor' });
    }

    if (!user || (user.estado !== true && user.estado !== 1)) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado o inactivo' });
    }

    const passwordMatches = await bcrypt.compare(currentPassword.toString(), user.password || '');
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta' });
    }

    const hashedPassword = await bcrypt.hash(newPassword.toString(), 10);
    let updatePayload = { password: hashedPassword, needs_password_change: false };
    let updateResult = await supabase
      .from('usuarios')
      .update(updatePayload)
      .eq('id', user.id);

    if (updateResult.error && updateResult.error.message && updateResult.error.message.includes('needs_password_change')) {
      delete updatePayload.needs_password_change;
      updateResult = await supabase
        .from('usuarios')
        .update(updatePayload)
        .eq('id', user.id);
    }

    if (updateResult.error) {
      console.error('Error al actualizar contraseña:', updateResult.error);
      return res.status(500).json({ success: false, message: 'Error al actualizar la contraseña' });
    }

    return res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error en change-password:', error);
    return res.status(500).json({ success: false, message: 'Error en servidor' });
  }
};
