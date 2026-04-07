# Esquema de Base de Datos

## Tabla: usuarios
```sql
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    rol ENUM('Administrador', 'Técnico', 'Cliente') NOT NULL,
    estado BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Tabla: clientes
```sql
CREATE TABLE clientes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT UNIQUE,
    empresa VARCHAR(200),
    telefono VARCHAR(20),
    direccion TEXT,
    ciudad VARCHAR(100),
    pais VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
```

## Tabla: tecnicos
```sql
CREATE TABLE tecnicos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT UNIQUE,
    especialidad VARCHAR(150),
    disponible BOOLEAN DEFAULT 1,
    telefono_contacto VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
```

## Tabla: equipos_climatizacion
```sql
CREATE TABLE equipos_climatizacion (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cliente_id INT,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    serial VARCHAR(100) UNIQUE,
    tipo ENUM('Aire Acondicionado', 'Ventilación', 'Calefacción', 'Otro'),
    fecha_instalacion DATE,
    ubicacion TEXT,
    estado ENUM('Activo', 'Inactivo', 'En Reparación') DEFAULT 'Activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);
```

## Tabla: ordenes_mantenimiento
```sql
CREATE TABLE ordenes_mantenimiento (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cliente_id INT,
    equipo_id INT,
    tecnico_id INT,
    tipo ENUM('Preventivo', 'Correctivo') NOT NULL,
    descripcion TEXT,
    estado ENUM('Pendiente', 'Asignada', 'En Progreso', 'Completada', 'Cancelada') DEFAULT 'Pendiente',
    fecha_programada DATETIME,
    fecha_completada DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (equipo_id) REFERENCES equipos_climatizacion(id),
    FOREIGN KEY (tecnico_id) REFERENCES tecnicos(id)
);
```

## Tabla: mantenimientos
```sql
CREATE TABLE mantenimientos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    orden_id INT,
    tecnico_id INT,
    notas TEXT,
    tiempo_dedicado INT COMMENT 'minutos',
    repuestos_utilizados TEXT,
    fecha_inicio DATETIME,
    fecha_fin DATETIME,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (orden_id) REFERENCES ordenes_mantenimiento(id),
    FOREIGN KEY (tecnico_id) REFERENCES tecnicos(id)
);
```

## Tabla: cotizaciones
```sql
CREATE TABLE cotizaciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cliente_id INT,
    descripcion TEXT,
    monto_estimado DECIMAL(10, 2),
    estado ENUM('Pendiente', 'Aprobada', 'Rechazada') DEFAULT 'Pendiente',
    fecha_solicitud DATETIME,
    fecha_respuesta DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);
```

## Tabla: evidencias
```sql
CREATE TABLE evidencias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    mantenimiento_id INT,
    archivo_nombre VARCHAR(255),
    archivo_ruta TEXT,
    tipo ENUM('Foto', 'Documento', 'Video'),
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mantenimiento_id) REFERENCES mantenimientos(id)
);
```
