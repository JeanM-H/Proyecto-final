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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const id = pathname.split('/').pop();

    // GET /api/repuestos - Listar todos
    if (req.method === 'GET' && pathname === '/api/repuestos') {
      const { data, error } = await supabase
        .from('repuestos')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }
      return res.status(200).json({ success: true, data });
    }

    // GET /api/repuestos/:id - Obtener repuesto por ID
    if (req.method === 'GET' && id !== 'repuestos' && id !== 'api') {
      const { data, error } = await supabase
        .from('repuestos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return res.status(404).json({ success: false, message: 'Repuesto no encontrado' });
      }
      return res.status(200).json({ success: true, data });
    }

    // POST /api/repuestos - Crear
    if (req.method === 'POST' && pathname === '/api/repuestos') {
      const payload = await parseJsonBody(req);
      const { nombre, codigo, descripcion, cantidad, cantidad_minima, precio_unitario, proveedor, estado } = payload;

      if (!nombre) {
        return res.status(400).json({ success: false, message: 'El nombre es requerido' });
      }

      const { data, error } = await supabase
        .from('repuestos')
        .insert([{
          nombre,
          codigo: codigo || null,
          descripcion: descripcion || null,
          cantidad: cantidad || 0,
          cantidad_minima: cantidad_minima || 5,
          precio_unitario: precio_unitario || 0,
          proveedor: proveedor || null,
          estado: estado || 'Activo'
        }])
        .select();

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.status(201).json({ success: true, data: data[0] });
    }

    // PUT /api/repuestos/:id - Actualizar
    if (req.method === 'PUT' && id !== 'repuestos' && id !== 'api') {
      const payload = await parseJsonBody(req);
      const { nombre, codigo, descripcion, cantidad, cantidad_minima, precio_unitario, proveedor, estado } = payload;

      const updateData = {};
      if (nombre !== undefined) updateData.nombre = nombre;
      if (codigo !== undefined) updateData.codigo = codigo;
      if (descripcion !== undefined) updateData.descripcion = descripcion;
      if (cantidad !== undefined) updateData.cantidad = cantidad;
      if (cantidad_minima !== undefined) updateData.cantidad_minima = cantidad_minima;
      if (precio_unitario !== undefined) updateData.precio_unitario = precio_unitario;
      if (proveedor !== undefined) updateData.proveedor = proveedor;
      if (estado !== undefined) updateData.estado = estado;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('repuestos')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.status(200).json({ success: true, data: data[0] });
    }

    // DELETE /api/repuestos/:id - Eliminar
    if (req.method === 'DELETE' && id !== 'repuestos' && id !== 'api') {
      const { error } = await supabase
        .from('repuestos')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.status(200).json({ success: true, message: 'Repuesto eliminado' });
    }

    res.status(404).json({ success: false, message: 'Ruta no encontrada' });
  } catch (error) {
    console.error('Error en repuestos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
