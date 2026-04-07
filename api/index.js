const fs = require('fs');
const path = require('path');

// Archivo de base de datos JSON
const dbPath = path.join(__dirname, '..', 'database.json');

// Datos iniciales
const initialData = {
  usuarios: [
    {
      id: 1,
      email: 'admin@climatizacion.com',
      password: 'Admin123',
      nombre: 'Juan Administrador',
      rol: 'Administrador',
      estado: 1,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      email: 'tecnico@climatizacion.com',
      password: 'Tecnico123',
      nombre: 'Carlos Técnico',
      rol: 'Técnico',
      estado: 1,
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      email: 'cliente@example.com',
      password: 'Cliente123',
      nombre: 'María Cliente',
      rol: 'Cliente',
      estado: 1,
      created_at: new Date().toISOString()
    }
  ],
  clientes: [
    {
      id: 1,
      usuario_id: 3,
      empresa: 'Empresa Ejemplo S.A.',
      telefono: '3001234567',
      direccion: 'Calle 123 #45-67',
      ciudad: 'Bogotá',
      pais: 'Colombia',
      created_at: new Date().toISOString()
    }
  ],
  tecnicos: [
    {
      id: 1,
      usuario_id: 2,
      especialidad: 'Climatización Industrial',
      disponible: 1,
      telefono_contacto: '3019876543',
      created_at: new Date().toISOString()
    }
  ],
  equipos_climatizacion: [
    {
      id: 1,
      cliente_id: 1,
      marca: 'Samsung',
      modelo: 'AC-2000',
      serial: 'SN123456789',
      tipo: 'Aire Acondicionado',
      fecha_instalacion: '2023-06-15',
      ubicacion: 'Oficina Principal - Piso 2',
      estado: 'Activo',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      cliente_id: 1,
      marca: 'LG',
      modelo: 'HVAC-5000',
      serial: 'SN987654321',
      tipo: 'Ventilación',
      fecha_instalacion: '2024-01-20',
      ubicacion: 'Sala de Servidores',
      estado: 'Activo',
      created_at: new Date().toISOString()
    }
  ],
  ordenes_mantenimiento: [
    {
      id: 1,
      cliente_id: 1,
      equipo_id: 1,
      tecnico_id: 1,
      tipo: 'Preventivo',
      descripcion: 'Mantenimiento preventivo mensual - Limpieza de filtros y verificación de funcionamiento',
      estado: 'Pendiente',
      fecha_programada: '2026-04-15 09:00:00',
      prioridad: 'Media',
      created_at: new Date().toISOString()
    }
  ]
};

// Función para leer datos
function readData() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      return JSON.parse(data);
    } else {
      // Crear archivo con datos iniciales
      fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
      return initialData;
    }
  } catch (error) {
    console.error('Error leyendo datos:', error);
    return initialData;
  }
}

// Función para guardar datos
function saveData(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error guardando datos:', error);
  }
}

module.exports = async (req, res) => {
  const url = require('url');
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // API: Health check
  if (pathname === '/api/health') {
    return res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  }

  // API: Info
  if (pathname === '/api') {
    return res.status(200).json({
      mensaje: 'API de Climatización - Sistema de Mantenimiento',
      version: '1.0.0',
      status: 'OK'
    });
  }

  // API: Login
  if (pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);

        if (!data.email || !data.password || !data.role) {
          return res.status(400).json({ success: false, message: 'Datos incompletos' });
        }

        const db = readData();
        const user = db.usuarios.find(u =>
          u.email === data.email &&
          u.rol === data.role &&
          u.estado === 1
        );

        if (!user) {
          return res.status(401).json({ success: false, message: 'Usuario no encontrado o rol incorrecto' });
        }

        // Por ahora aceptamos cualquier contraseña (sin hash)
        return res.status(200).json({
          success: true,
          message: 'Login exitoso',
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
    return;
  }

  // Servir index.html para todas las otras rutas
  try {
    const filePath = path.join(__dirname, '..', 'index.html');
    const html = fs.readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (err) {
    res.status(200).json({ status: 'OK' });
  }
};
        serial TEXT UNIQUE,
        tipo TEXT,
        fecha_instalacion DATE,
        ubicacion TEXT,
        estado TEXT DEFAULT 'Activo' CHECK(estado IN ('Activo', 'Inactivo', 'Mantenimiento')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS ordenes_mantenimiento (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        equipo_id INTEGER,
        tecnico_id INTEGER,
        tipo TEXT NOT NULL CHECK(tipo IN ('Preventivo', 'Correctivo', 'Instalación')),
        descripcion TEXT,
        estado TEXT DEFAULT 'Pendiente' CHECK(estado IN ('Pendiente', 'En Progreso', 'Completado', 'Cancelado')),
        fecha_programada DATETIME,
        fecha_completada DATETIME,
        prioridad TEXT DEFAULT 'Media' CHECK(prioridad IN ('Baja', 'Media', 'Alta', 'Urgente')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (equipo_id) REFERENCES equipos_climatizacion(id),
        FOREIGN KEY (tecnico_id) REFERENCES tecnicos(id)
      )`);

      // Insertar datos de prueba si no existen
      db.get("SELECT COUNT(*) as count FROM usuarios", (err, row) => {
        if (!row || row.count === 0) {
          // Insertar usuarios de prueba
          db.run(`INSERT INTO usuarios (email, password, nombre, rol) VALUES
            ('admin@climatizacion.com', 'Admin123', 'Juan Administrador', 'Administrador'),
            ('tecnico@climatizacion.com', 'Tecnico123', 'Carlos Técnico', 'Técnico'),
            ('cliente@example.com', 'Cliente123', 'María Cliente', 'Cliente')`);

          // Insertar datos relacionados
          db.run(`INSERT INTO clientes (usuario_id, empresa, telefono, direccion, ciudad, pais) VALUES
            (3, 'Empresa Ejemplo S.A.', '3001234567', 'Calle 123 #45-67', 'Bogotá', 'Colombia')`);

          db.run(`INSERT INTO tecnicos (usuario_id, especialidad, disponible, telefono_contacto) VALUES
            (2, 'Climatización Industrial', 1, '3019876543')`);

          db.run(`INSERT INTO equipos_climatizacion (cliente_id, marca, modelo, serial, tipo, fecha_instalacion, ubicacion, estado) VALUES
            (1, 'Samsung', 'AC-2000', 'SN123456789', 'Aire Acondicionado', '2023-06-15', 'Oficina Principal - Piso 2', 'Activo'),
            (1, 'LG', 'HVAC-5000', 'SN987654321', 'Ventilación', '2024-01-20', 'Sala de Servidores', 'Activo')`);
        }
        resolve();
      });
    });
  });
}

// Inicializar BD al cargar
initDatabase().catch(console.error);

module.exports = async (req, res) => {
  const url = require('url');
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // API: Health check
  if (pathname === '/api/health') {
    return res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  }

  // API: Info
  if (pathname === '/api') {
    return res.status(200).json({
      mensaje: 'API de Climatización - Sistema de Mantenimiento',
      version: '1.0.0',
      status: 'OK'
    });
  }

  // API: Login
  if (pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);

        if (!data.email || !data.password || !data.role) {
          return res.status(400).json({ success: false, message: 'Datos incompletos' });
        }

        // Verificar usuario en SQLite
        db.get(
          'SELECT id, nombre, rol FROM usuarios WHERE email = ? AND rol = ? AND estado = 1',
          [data.email, data.role],
          (err, user) => {
            if (err) {
              console.error('Error en consulta:', err);
              return res.status(500).json({ success: false, message: 'Error en servidor' });
            }

            if (!user) {
              return res.status(401).json({ success: false, message: 'Usuario no encontrado o rol incorrecto' });
            }

            // Por ahora aceptamos cualquier contraseña (sin hash)
            return res.status(200).json({
              success: true,
              message: 'Login exitoso',
              user: {
                id: user.id,
                nombre: user.nombre,
                email: data.email,
                rol: user.rol
              }
            });
          }
        );

      } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({ success: false, message: 'Error en servidor' });
      }
    });
    return;
  }

  // Servir index.html para todas las otras rutas
  try {
    const fs = require('fs');
    const filePath = path.join(__dirname, '..', 'index.html');
    const html = fs.readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (err) {
    res.status(200).json({ status: 'OK' });
  }
};