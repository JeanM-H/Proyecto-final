const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'climatizacion_db',
  port: process.env.DB_PORT || 3306,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

async function getConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error('Error conectando a MySQL:', error);
    throw error;
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

// API: Inicializar BD
  if (pathname === '/api/init-db' && req.method === 'POST') {
    try {
      const connection = await getConnection();

      // Crear tablas
      const fs = require('fs');
      const path = require('path');
      const schemaPath = path.join(__dirname, '..', 'database', 'create_tables.sql');
      const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

      // Ejecutar cada statement por separado
      const statements = schemaSQL.split(';').filter(stmt => stmt.trim().length > 0);

      for (const statement of statements) {
        if (statement.trim()) {
          await connection.execute(statement);
        }
      }

      // Insertar datos de prueba
      const seedPath = path.join(__dirname, '..', 'database', 'insert_test_data.sql');
      const seedSQL = fs.readFileSync(seedPath, 'utf-8');
      const seedStatements = seedSQL.split(';').filter(stmt => stmt.trim().length > 0);

      for (const statement of seedStatements) {
        if (statement.trim() && !statement.includes('SELECT')) {
          await connection.execute(statement);
        }
      }

      await connection.end();

      return res.status(200).json({
        success: true,
        message: 'Base de datos inicializada correctamente'
      });

    } catch (error) {
      console.error('Error inicializando BD:', error);
      return res.status(500).json({ success: false, message: 'Error inicializando BD: ' + error.message });
    }
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

        const connection = await getConnection();

        // Verificar usuario
        const [rows] = await connection.execute(
          'SELECT id, nombre, rol, estado FROM usuarios WHERE email = ? AND rol = ? AND estado = 1',
          [data.email, data.role]
        );

        await connection.end();

        if (rows.length === 0) {
          return res.status(401).json({ success: false, message: 'Usuario no encontrado o rol incorrecto' });
        }

        const user = rows[0];

        // Por ahora aceptamos cualquier contraseña (sin hash)
        // TODO: Implementar bcrypt para verificar contraseña hasheada
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
    const path = require('path');
    const filePath = path.join(__dirname, '..', 'index.html');
    const html = fs.readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (err) {
    res.status(200).json({ status: 'OK' });
  }
};