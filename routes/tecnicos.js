const express = require('express');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan las variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const generateTemporaryPassword = (nombre, apellido) => {
  const base = `${nombre || ''}${apellido || ''}`
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8) || 'usuario';
  const digits = Math.floor(100 + Math.random() * 900);
  return `${base}${digits}`;
};

router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tecnicos')
      .select('id, usuario_id, especialidad, disponible, telefono_contacto, created_at, usuario:usuarios(nombre, email)')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error tecnicos:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener técnicos' });
    }

    return res.status(200).json({ success: true, tecnicos: data || [] });
  } catch (error) {
    console.error('Error tecnicos:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener técnicos' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { nombre, apellido, email, especialidad, telefono_contacto } = req.body;

    if (!nombre || !apellido || !email || !especialidad) {
      return res.status(400).json({ success: false, message: 'Datos incompletos para crear el técnico' });
    }

    const emailCheck = await supabase.from('usuarios').select('id').eq('email', email).maybeSingle();
    if (emailCheck.error) {
      console.error('Error verificando email técnico:', emailCheck.error);
      return res.status(500).json({ success: false, message: 'Error en servidor' });
    }
    if (emailCheck.data) {
      return res.status(409).json({ success: false, message: 'El email ya está registrado' });
    }

    const password = generateTemporaryPassword(nombre, apellido);
    const hashedPassword = await bcrypt.hash(password, 10);
    const nombreCompleto = `${nombre.trim()} ${apellido.trim()}`;

    const { data: usuario, error: insertUserError } = await supabase
      .from('usuarios')
      .insert({ nombre: nombreCompleto, email, password: hashedPassword, rol: 'Técnico', estado: true })
      .select('id')
      .single();

    if (insertUserError) {
      console.error('Error creando usuario técnico:', insertUserError);
      return res.status(500).json({ success: false, message: 'Error al crear técnico' });
    }

    const { data, error } = await supabase
      .from('tecnicos')
      .insert({ usuario_id: usuario.id, especialidad, disponible: true, telefono_contacto })
      .single();

    if (error) {
      console.error('Error creando técnico:', error);
      return res.status(500).json({ success: false, message: 'Error al crear técnico' });
    }

    return res.status(201).json({
      success: true,
      message: 'Técnico creado correctamente',
      tecnico: data,
      generatedPassword: password
    });
  } catch (error) {
    console.error('Error tecnicos POST:', error);
    return res.status(500).json({ success: false, message: 'Error al crear el técnico' });
  }
});

module.exports = router;
