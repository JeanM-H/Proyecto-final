const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conexión a SQLite
const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// Inicializar base de datos
function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Crear tablas
      db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nombre TEXT NOT NULL,
        rol TEXT NOT NULL CHECK(rol IN ('Administrador', 'Técnico', 'Cliente')),
        estado INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER UNIQUE,
        empresa TEXT,
        telefono TEXT,
        direccion TEXT,
        ciudad TEXT,
        pais TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS tecnicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER UNIQUE,
        especialidad TEXT,
        disponible INTEGER DEFAULT 1,
        telefono_contacto TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS equipos_climatizacion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        marca TEXT,
        modelo TEXT,
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