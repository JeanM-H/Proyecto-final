const supabase = require('./supabaseClient');

function generateRecoveryCode() {
  return Math.random().toString().substring(2, 8).padEnd(6, '0');
}

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
      const { email, role } = payload;

      if (!email || !role) {
        return res.status(400).json({ success: false, message: 'Email y rol son requeridos' });
      }

      // Determinar tabla según el rol
      const table = role === 'Técnico' ? 'tecnicos' : role === 'Cliente' ? 'clientes' : null;
      if (!table) {
        return res.status(400).json({ success: false, message: 'Rol inválido' });
      }

      // Buscar usuario por email
      const { data: user, error: searchError } = await supabase
        .from(table)
        .select('id, nombre, email')
        .eq('email', email)
        .maybeSingle();

      if (searchError) {
        console.error('Error buscando usuario:', searchError);
        return res.status(500).json({ success: false, message: 'Error al procesar solicitud' });
      }

      if (!user) {
        // Por seguridad, no revelamos si el email existe o no
        return res.status(200).json({ 
          success: true, 
          message: 'Si la cuenta existe, recibirás instrucciones de recuperación' 
        });
      }

      // Generar código de recuperación
      const recoveryCode = generateRecoveryCode();

      // Guardar código en una tabla temporal (para este proyecto usamos metadata en el usuario)
      // En producción, deberías usar una tabla separada con tokens y fechas de expiración
      const { error: updateError } = await supabase
        .from(table)
        .update({ 
          recovery_code: recoveryCode,
          recovery_code_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // Válido por 15 minutos
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error guardando código:', updateError);
        return res.status(500).json({ success: false, message: 'Error al generar código' });
      }

      // En producción, aquí enviarías un email real
      // Aquí devolvemos el código para propósitos de desarrollo
      console.log(`Recovery code for ${email}: ${recoveryCode}`);

      return res.status(200).json({ 
        success: true, 
        message: 'Si la cuenta existe, recibirás instrucciones de recuperación',
        recovery_code: recoveryCode // Solo para desarrollo, ocultar en producción
      });
    } catch (error) {
      console.error('Error en forgot-password:', error);
      return res.status(500).json({ success: false, message: 'Error del servidor' });
    }
  }

  return res.status(405).json({ success: false, message: 'Método no permitido' });
};
