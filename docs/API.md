# API Endpoints - Documentación

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

### Crear Orden
```
POST /api/ordenes
Headers: Authorization: Bearer {token}
Body:
{
  "cliente_id": 1,
  "equipo_id": 1,
  "tipo": "Preventivo|Correctivo",
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
