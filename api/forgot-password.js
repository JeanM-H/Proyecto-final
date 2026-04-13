const supabase = require('../supabaseClient');
const nodemailer = require('nodemailer');

const emailConfigured = Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  process.env.EMAIL_FROM
);

let transporter = null;
if (emailConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

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

async function sendRecoveryEmail(email, nombre, role, recoveryCode) {
  if (!transporter) return false;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Recuperación de contraseña CoolCare',
    html: `
      <p>Hola ${nombre || role},</p>
      <p>Has solicitado restablecer tu contraseña. Usa el siguiente código de recuperación:</p>
      <div style="padding: 12px; background: #f4f7ff; border-radius: 12px; display: inline-block; font-size: 1.2rem; letter-spacing: 0.09em; font-weight: 700;">${recoveryCode}</div>
      <p>Este código expira en 15 minutos.</p>
      <p>Si no solicitaste este cambio, ignora este correo.</p>
    `
  };

  await transporter.sendMail(mailOptions);
  return true;
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
    const { email, role } = payload;

    if (!email || !role) {
      return res.status(400).json({ success: false, message: 'Email y rol son requeridos' });
    }

    // Buscar el usuario en la tabla de autenticación
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
      return res.status(200).json({
        success: true,
        message: 'Si la cuenta existe, recibirás instrucciones de recuperación'
      });
    }

    const recoveryCode = generateRecoveryCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: tokenError } = await supabase
      .from('recovery_tokens')
      .upsert(
        {
          user_id: user.id,
          email: user.email,
          role: user.rol,
          token: recoveryCode,
          expires_at: expiresAt
        },
        { onConflict: ['user_id'] }
      );

    if (tokenError) {
      console.error('Error guardando token de recuperación:', tokenError);
      const tokenMessage = tokenError.message && tokenError.message.includes('recovery_tokens')
        ? 'La tabla recovery_tokens no existe en la base de datos. Crea la tabla usando el SQL de migración.'
        : 'Error al generar código de recuperación';
      return res.status(500).json({ success: false, message: tokenMessage });
    }

    let emailSent = false;
    if (emailConfigured) {
      try {
        emailSent = await sendRecoveryEmail(user.email, user.nombre, user.rol, recoveryCode);
      } catch (sendError) {
        console.error('Error enviando email de recuperación:', sendError);
        return res.status(500).json({ success: false, message: 'No se pudo enviar el correo de recuperación' });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Si la cuenta existe, recibirás instrucciones de recuperación',
      emailSent,
      recovery_code: emailSent ? null : recoveryCode
    });
  } catch (error) {
    console.error('Error en forgot-password:', error);
    return res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};
