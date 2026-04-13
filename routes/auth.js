const express = require('express');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan las variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Datos incompletos' });
    }

    let userResult = await supabase
      .from('usuarios')
      .select('id, nombre, email, rol, password, estado')
      .eq('email', email)
      .eq('rol', role)
      .maybeSingle();

    if (userResult.error && userResult.error.message && userResult.error.message.includes('unique')) {
      userResult = await supabase
        .from('usuarios')
        .select('id, nombre, email, rol, password, estado')
        .eq('email', email)
        .eq('rol', role)
        .maybeSingle();
    }

    const { data: user, error } = userResult;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ success: false, message: 'Error en servidor' });
    }

    const hasValidPassword = user && await bcrypt.compare(password.toString(), user.password || '');
    const isActive = user && (user.estado === true || user.estado === 1);

    if (!user || !isActive || !hasValidPassword) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado, contraseña inválida o rol incorrecto' });
    }

    // Generar JWT
    const token = generateToken({ id: user.id, email: user.email, rol: user.rol });

    return res.status(200).json({
      success: true,
      message: 'Login exitoso',
      token,
      needsPasswordChange: false,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ success: false, message: 'Error en servidor' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // Para JWT, el logout se maneja en frontend eliminando el token
  res.json({ success: true, message: 'Logout exitoso' });
});

// GET /api/auth/validate
router.get('/validate', require('../middleware/auth').verifyToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;