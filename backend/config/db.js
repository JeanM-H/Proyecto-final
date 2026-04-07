// Conexión a la base de datos MySQL
const mysql = require('mysql2/promise');
require('dotenv').config();

const poolConfig = process.env.MYSQL_URL
    ? process.env.MYSQL_URL
    : {
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'climatizacion_db',
          port: process.env.DB_PORT || 3306,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
      };

const pool = mysql.createPool(poolConfig);

module.exports = pool;
