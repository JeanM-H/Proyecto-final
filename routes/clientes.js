const express = require('express');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function generateTemporaryPassword(nombre, apellido) {
  const base = `${nombre || ''}${apellido || ''}`
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8) || 'usuario';
  const digits = Math.floor(100 + Math.random() * 900);
  return `${base}${digits}`;
}

// GET /api/clientes
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, usuario_id, empresa, telefono, direccion, ciudad, pais, created_at, usuario:usuarios(nombre, email)')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error clientes:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener clientes' });
    }

    return res.status(200).json({ success: true, clientes: data || [] });
  } catch (error) {
    console.error('Error clientes:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener clientes' });
  }
});

// POST /api/clientes
router.post('/', verifyToken, async (req, res) => {
  try {
    const { nombre, apellido, email, empresa, telefono, direccion, ciudad, pais } = req.body;

    if (!nombre || !apellido || !email || !empresa) {
      return res.status(400).json({ success: false, message: 'Datos incompletos para crear el cliente' });
    }

    const password = generateTemporaryPassword(nombre, apellido);
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: existingUser, error: checkError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      console.error('Error verificando email cliente:', checkError);
      return res.status(500).json({ success: false, message: 'Error en servidor' });
    }

    if (existingUser) {
      return res.status(409).json({ success: false, message: 'El email ya está registrado' });
    }

    const nombreCompleto = `${nombre.trim()} ${apellido.trim()}`;
    const { data: usuario, error: insertUserError } = await supabase
      .from('usuarios')
      .insert({
        nombre: nombreCompleto,
        email,
        password: hashedPassword,
        rol: 'Cliente',
        estado: true,
        needs_password_change: true
      })
      .select('id')
      .single();

    if (insertUserError) {
      console.error('Error creando usuario cliente:', insertUserError);
      return res.status(500).json({ success: false, message: 'Error al crear el cliente' });
    }

    const { data: cliente, error: insertClienteError } = await supabase
      .from('clientes')
      .insert({ usuario_id: usuario.id, empresa, telefono, direccion, ciudad, pais })
      .single();

    if (insertClienteError) {
      console.error('Error creando cliente:', insertClienteError);
      return res.status(500).json({ success: false, message: 'Error al crear el cliente' });
    }

    return res.status(201).json({
      success: true,
      message: 'Cliente creado correctamente',
      cliente,
      generatedPassword: password
    });
  } catch (error) {
    console.error('Error clientes POST:', error);
    return res.status(500).json({ success: false, message: 'Error al crear clientes' });
  }
});

// PUT /api/clientes
router.put('/', verifyToken, async (req, res) => {
  try {
    const { id, empresa, telefono, direccion, ciudad, pais } = req.body;

    if (!id || !empresa) {
      return res.status(400).json({ success: false, message: 'ID y empresa son requeridos' });
    }

    const { data: cliente, error: updateError } = await supabase
      .from('clientes')
      .update({ empresa, telefono, direccion, ciudad, pais })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error actualizando cliente:', updateError);
      return res.status(500).json({ success: false, message: 'Error al actualizar cliente' });
    }

    return res.status(200).json({
      success: true,
      message: 'Cliente actualizado correctamente',
      cliente
    });
  } catch (error) {
    console.error('Error clientes PUT:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar cliente' });
  }
});

// DELETE /api/clientes
router.delete('/', verifyToken, async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'ID es requerido' });
    }

    const { data: cliente, error: selectError } = await supabase
      .from('clientes')
      .select('usuario_id')
      .eq('id', id)
      .single();

    if (selectError) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }

    const { error: deleteClienteError } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

    if (deleteClienteError) {
      console.error('Error eliminando cliente:', deleteClienteError);
      return res.status(500).json({ success: false, message: 'Error al eliminar cliente' });
    }

    if (cliente.usuario_id) {
      await supabase.from('usuarios').delete().eq('id', cliente.usuario_id);
    }

    return res.status(200).json({
      success: true,
      message: 'Cliente eliminado correctamente'
    });
  } catch (error) {
    console.error('Error clientes DELETE:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar cliente' });
  }
});

module.exports = router;