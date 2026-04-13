# API Endpoints - Documentación Completa

## Arquitectura del Sistema

### Arquitectura General
El sistema sigue una arquitectura de **3 capas**:

1. **Frontend (Cliente)**: HTML5 + CSS3 + JavaScript
   - Páginas: `admin.html`, `tech.html`, `client.html`
   - Consumo de APIs REST via fetch()

2. **Backend (Servidor)**: Node.js + Express
   - API REST con autenticación JWT
   - Lógica de negocio y validaciones
   - Middleware de permisos por rol

3. **Base de Datos**: PostgreSQL (Supabase)
   - Persistencia de datos
   - Relaciones y constraints

### Diagrama Conceptual
```
[ Cliente Web (HTML/JS) ]
         ↓
[ API REST (Node.js/Express) ]
         ↓
[ Base de Datos (PostgreSQL) ]
```

## Modelo Entidad-Relación (ER)

### Diagrama Visual
Para ver el diagrama completo de entidades y relaciones, consulta el archivo [`ER.md`](ER.md) en esta misma carpeta.

### Entidades Principales

#### Usuarios
- **id** (PK): BIGINT
- **email**: TEXT UNIQUE
- **password**: TEXT (hash bcrypt)
- **nombre**: TEXT
- **rol**: TEXT (Administrador|Técnico|Cliente)
- **estado**: BOOLEAN
- **created_at**: TIMESTAMPTZ
- **updated_at**: TIMESTAMPTZ
- **created_by**: BIGINT (FK → usuarios)
- **updated_by**: BIGINT (FK → usuarios)

#### Clientes
- **id** (PK): BIGINT
- **usuario_id** (FK → usuarios): BIGINT UNIQUE
- **empresa**: TEXT
- **telefono**: TEXT
- **direccion**: TEXT
- **ciudad**: TEXT
- **pais**: TEXT
- **created_at**: TIMESTAMPTZ

#### Técnicos
- **id** (PK): BIGINT
- **usuario_id** (FK → usuarios): BIGINT UNIQUE
- **especialidad**: TEXT
- **disponible**: BOOLEAN
- **telefono_contacto**: TEXT
- **created_at**: TIMESTAMPTZ

#### Equipos de Climatización
- **id** (PK): BIGINT
- **cliente_id** (FK → clientes): BIGINT
- **marca**: TEXT
- **modelo**: TEXT
- **serial**: TEXT UNIQUE
- **tipo**: TEXT (Aire Acondicionado|Ventilación|Calefacción|Otro)
- **fecha_instalacion**: DATE
- **ubicacion**: TEXT
- **estado**: TEXT (Activo|Inactivo|En Reparación)
- **created_at**: TIMESTAMPTZ

#### Órdenes de Mantenimiento
- **id** (PK): BIGINT
- **cliente_id** (FK → clientes): BIGINT
- **equipo_id** (FK → equipos_climatizacion): BIGINT
- **tecnico_id** (FK → tecnicos): BIGINT NULL
- **tipo**: TEXT (Preventivo|Correctivo)
- **descripcion**: TEXT
- **estado**: TEXT (Pendiente|Asignada|En Progreso|Completada|Cancelada)
- **fecha_programada**: TIMESTAMPTZ
- **fecha_completada**: TIMESTAMPTZ
- **created_at**: TIMESTAMPTZ
- **updated_at**: TIMESTAMPTZ
- **created_by** (FK → usuarios): BIGINT
- **updated_by** (FK → usuarios): BIGINT

#### Mantenimientos
- **id** (PK): BIGINT
- **orden_id** (FK → ordenes_mantenimiento): BIGINT
- **tecnico_id** (FK → tecnicos): BIGINT NULL
- **notas**: TEXT
- **tiempo_dedicado**: INT
- **repuestos_utilizados**: TEXT (legacy)
- **fecha_inicio**: TIMESTAMPTZ
- **fecha_fin**: TIMESTAMPTZ
- **observaciones**: TEXT
- **created_at**: TIMESTAMPTZ
- **created_by** (FK → usuarios): BIGINT
- **updated_by** (FK → usuarios): BIGINT

#### Repuestos
- **id** (PK): BIGINT
- **nombre**: TEXT
- **descripcion**: TEXT
- **precio**: DECIMAL(10,2)
- **stock**: INT
- **created_at**: TIMESTAMPTZ
- **updated_at**: TIMESTAMPTZ
- **created_by** (FK → usuarios): BIGINT
- **updated_by** (FK → usuarios): BIGINT

#### Detalle_Repuestos
- **id** (PK): BIGINT
- **mantenimiento_id** (FK → mantenimientos): BIGINT
- **repuesto_id** (FK → repuestos): BIGINT
- **cantidad**: INT
- **created_at**: TIMESTAMPTZ

#### Cotizaciones
- **id** (PK): BIGINT
- **cliente_id** (FK → clientes): BIGINT
- **descripcion**: TEXT
- **monto_estimado**: DECIMAL(10,2)
- **estado**: TEXT (Pendiente|Aprobada|Rechazada)
- **fecha_solicitud**: TIMESTAMPTZ
- **fecha_respuesta**: TIMESTAMPTZ
- **created_at**: TIMESTAMPTZ
- **created_by** (FK → usuarios): BIGINT
- **updated_by** (FK → usuarios): BIGINT

#### Evidencias
- **id** (PK): BIGINT
- **mantenimiento_id** (FK → mantenimientos): BIGINT
- **archivo_nombre**: TEXT
- **archivo_ruta**: TEXT
- **tipo**: TEXT (Foto|Documento|Video)
- **descripcion**: TEXT
- **created_at**: TIMESTAMPTZ
- **created_by** (FK → usuarios): BIGINT

### Relaciones
- Usuarios ←1:1→ Clientes
- Usuarios ←1:1→ Técnicos
- Clientes ←1:N→ Equipos
- Clientes ←1:N→ Órdenes
- Clientes ←1:N→ Cotizaciones
- Equipos ←1:N→ Órdenes
- Técnicos ←1:N→ Órdenes
- Técnicos ←1:N→ Mantenimientos
- Órdenes ←1:1→ Mantenimientos
- Mantenimientos ←1:N→ Evidencias
- Mantenimientos ←1:N→ Detalle_Repuestos
- Repuestos ←1:N→ Detalle_Repuestos

## Autenticación

### Login
```
POST /api/auth/login
Parámetros:
  - email (string)
  - password (string)
  - rol (Administrador|Técnico|Cliente)

Respuesta:
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "nombre": "Administrador",
    "rol": "Administrador"
  }
}
```

### Logout
```
POST /api/auth/logout
Headers: Authorization: Bearer {token}
```

### Validar Token
```
GET /api/auth/validate
Headers: Authorization: Bearer {token}
```

---

## Órdenes de Mantenimiento

### Crear Orden (Admin)
```
POST /api/ordenes
Headers: Authorization: Bearer {token}
Body:
{
  "cliente_id": 1,
  "equipo_id": 1,
  "tipo": "Preventivo|Correctivo",
  "descripcion": "Descripción del mantenimiento",
  "fecha_programada": "2024-01-15T10:00:00Z"
}
```

### Listar Órdenes (Admin)
```
GET /api/ordenes
Headers: Authorization: Bearer {token}
```

### Ver Órdenes Asignadas (Técnico)
```
GET /api/ordenes/assigned
Headers: Authorization: Bearer {token}
```

### Actualizar Orden
```
PUT /api/ordenes/:id
Headers: Authorization: Bearer {token}
Body: { "estado": "Completada", "fecha_completada": "2024-01-15T12:00:00Z" }
```

---

## Mantenimientos

### Crear Mantenimiento (Técnico)
```
POST /api/mantenimientos
Headers: Authorization: Bearer {token}
Body:
{
  "orden_id": 1,
  "notas": "Notas del mantenimiento",
  "tiempo_dedicado": 120,
  "repuestos": [
    {"repuesto_id": 1, "cantidad": 2},
    {"repuesto_id": 3, "cantidad": 1}
  ],
  "fecha_inicio": "2024-01-15T10:00:00Z",
  "fecha_fin": "2024-01-15T12:00:00Z",
  "observaciones": "Observaciones adicionales"
}
```

### Listar Mantenimientos (Admin)
```
GET /api/mantenimientos
Headers: Authorization: Bearer {token}
```

### Ver Mantenimientos por Técnico
```
GET /api/mantenimientos/tecnico/:tecnico_id
Headers: Authorization: Bearer {token}
```

### Actualizar Mantenimiento (Técnico/Admin)
```
PUT /api/mantenimientos/:id
Headers: Authorization: Bearer {token}
Body: { "notas": "Notas actualizadas", "repuestos": [{"repuesto_id": 2, "cantidad": 3}] }
```

---

## Evidencias

### Crear Evidencia (Técnico)
```
POST /api/evidencias
Headers: Authorization: Bearer {token}
Body:
{
  "mantenimiento_id": 1,
  "archivo_nombre": "foto1.jpg",
  "archivo_ruta": "https://example.com/foto1.jpg",
  "tipo": "Foto",
  "descripcion": "Foto del equipo reparado"
}
```

### Listar Evidencias (Admin)
```
GET /api/evidencias
Headers: Authorization: Bearer {token}
```

### Eliminar Evidencia (Técnico/Admin)
```
DELETE /api/evidencias/:id
Headers: Authorization: Bearer {token}
```

---

## Repuestos

### CRUD Completo (Admin)
```
GET /api/repuestos
POST /api/repuestos
PUT /api/repuestos/:id
DELETE /api/repuestos/:id
```

---

## Detalle Repuestos

### CRUD Completo (Admin)
```
GET /api/detalle-repuestos
POST /api/detalle-repuestos
PUT /api/detalle-repuestos/:id
DELETE /api/detalle-repuestos/:id
```

---

## Cotizaciones

### CRUD Completo (Admin)
```
GET /api/cotizaciones
POST /api/cotizaciones
PUT /api/cotizaciones/:id
DELETE /api/cotizaciones/:id
```

---

## Clientes

### CRUD Completo (Admin)
```
GET /api/clientes
POST /api/clientes
PUT /api/clientes
DELETE /api/clientes
```

### Endpoints Cliente
```
GET /api/clientes/me
GET /api/clientes/me/ordenes
GET /api/clientes/me/equipos
GET /api/clientes/me/cotizaciones
GET /api/clientes/me/mantenimientos
PUT /api/clientes/me
POST /api/clientes/me/solicitudes
```

---

## Técnicos

### CRUD Completo (Admin)
```
GET /api/tecnicos
POST /api/tecnicos
PUT /api/tecnicos/:id
DELETE /api/tecnicos/:id
```

### Endpoints Técnico
```
GET /api/tecnicos/me
PUT /api/tecnicos/me
```

---

## Equipos

### CRUD Completo (Admin)
```
GET /api/equipos
POST /api/equipos
PUT /api/equipos/:id
DELETE /api/equipos/:id
```

---

## Dashboard

### Métricas
```
GET /api/dashboard-metrics
Headers: Authorization: Bearer {token}
Respuesta:
{
  "success": true,
  "metrics": {
    "totalClientes": 10,
    "totalTecnicos": 5,
    "totalEquipos": 25,
    "totalOrdenes": 15,
    "ordenesPendientes": 3,
    "ordenesCompletadas": 12,
    "totalCotizaciones": 8,
    "totalRepuestos": 20
  }
}
```

---

## Códigos de Estado HTTP

- **200**: OK - Operación exitosa
- **201**: Created - Recurso creado
- **400**: Bad Request - Datos inválidos
- **401**: Unauthorized - Token faltante/inválido
- **403**: Forbidden - Permisos insuficientes
- **404**: Not Found - Recurso no encontrado
- **409**: Conflict - Email duplicado
- **500**: Internal Server Error - Error del servidor

## Seguridad

- **Autenticación**: JWT con expiración de 24 horas
- **Autorización**: Middleware `requireRole()` para validar permisos
- **Validaciones**: Verificación de pertenencia de recursos
- **Auditoría**: Campos `created_by`/`updated_by` en tablas críticas

## Tecnologías

- **Backend**: Node.js v18+, Express.js
- **Base de Datos**: PostgreSQL (Supabase)
- **Autenticación**: JWT, bcrypt
- **Despliegue**: Vercel (serverless functions)
- **Control de Versiones**: Git + GitHub
  "descripcion": "...",
  "fecha_programada": "2026-04-15"
}
```

### Obtener Órdenes
```
GET /api/ordenes
GET /api/ordenes/:id
GET /api/ordenes/cliente/:cliente_id
Headers: Authorization: Bearer {token}
```

### Actualizar Orden
```
PUT /api/ordenes/:id
Headers: Authorization: Bearer {token}
Body:
{
  "estado": "En Progreso",
  "descripcion": "..."
}
```

### Asignar Técnico
```
POST /api/ordenes/:id/asignar-tecnico
Headers: Authorization: Bearer {token}
Body:
{
  "tecnico_id": 2
}
```

---

## Clientes

### Crear Cliente
```
POST /api/clientes
Headers: Authorization: Bearer {token}
Body:
{
  "usuario_id": 1,
  "empresa": "Ejemplo S.A.",
  "telefono": "123456789",
  "direccion": "Calle 1",
  "ciudad": "Bogotá",
  "pais": "Colombia"
}
```

### Obtener Clientes
```
GET /api/clientes
GET /api/clientes/:id
Headers: Authorization: Bearer {token}
```

### Actualizar Cliente
```
PUT /api/clientes/:id
Headers: Authorization: Bearer {token}
```

### Eliminar Cliente
```
DELETE /api/clientes/:id
Headers: Authorization: Bearer {token}
```

---

## Equipos

### Crear Equipo
```
POST /api/equipos
Headers: Authorization: Bearer {token}
Body:
{
  "cliente_id": 1,
  "marca": "Samsung",
  "modelo": "AC-2000",
  "serial": "SN123456",
  "tipo": "Aire Acondicionado",
  "fecha_instalacion": "2025-01-15",
  "ubicacion": "Oficina Principal"
}
```

### Obtener Equipos
```
GET /api/equipos
GET /api/equipos/:id
GET /api/equipos/cliente/:cliente_id
Headers: Authorization: Bearer {token}
```

### Actualizar Equipo
```
PUT /api/equipos/:id
Headers: Authorization: Bearer {token}
```

---

## Mantenimientos

### Registrar Mantenimiento
```
POST /api/mantenimientos
Headers: Authorization: Bearer {token}
Body:
{
  "orden_id": 1,
  "notas": "Limpieza de filtros",
  "tiempo_dedicado": 60,
  "repuestos_utilizados": "Filtro aire",
  "observaciones": "Equipo funcionando correctamente"
}
```

### Obtener Mantenimientos
```
GET /api/mantenimientos
GET /api/mantenimientos/:id
GET /api/mantenimientos/tecnico/:tecnico_id
GET /api/mantenimientos/orden/:orden_id
Headers: Authorization: Bearer {token}
```

---

## Cotizaciones

### Solicitar Cotización
```
POST /api/cotizaciones
Headers: Authorization: Bearer {token}
Body:
{
  "cliente_id": 1,
  "descripcion": "Reparación compresor",
  "monto_estimado": 500000
}
```

### Obtener Cotizaciones
```
GET /api/cotizaciones
GET /api/cotizaciones/:id
GET /api/cotizaciones/cliente/:cliente_id
Headers: Authorization: Bearer {token}
```

### Actualizar Cotización
```
PUT /api/cotizaciones/:id
Headers: Authorization: Bearer {token}
Body:
{
  "estado": "Aprobada|Rechazada"
}
```
