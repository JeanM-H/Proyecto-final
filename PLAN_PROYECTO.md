# Plan de Desarrollo - Sistema de Mantenimiento de Climatización

## Descripción General
Solución web para gestionar el mantenimiento de equipos de climatización.
- **Empresa**: Sector mantenimiento y climatización
- **Usuarios**: Administrador, Técnico, Cliente
- **Objetivo**: Centralizar información y mejorar procesos

---

## Fases del Proyecto

### FASE 1: Autenticación y Gestión de Roles (Actual)
- [x] Diseño de página login
- [ ] Integración con backend
- [ ] Validación de credenciales
- [ ] Gestión de sesiones

### FASE 2: Vistas y Dashboards por Rol
- [ ] Dashboard Administrador
- [ ] Dashboard Técnico
- [ ] Dashboard Cliente

### FASE 3: Módulos Principales
- [ ] Gestión de órdenes de mantenimiento
- [ ] Administración de clientes
- [ ] Catálogo de equipos
- [ ] Registro de mantenimientos

### FASE 4: Funcionalidades Avanzadas
- [ ] Cotizaciones
- [ ] Evidencias y fotos
- [ ] Reportes y análisis

---

## Estructura del Proyecto

```
proyecto-final/
├── frontend/
│   ├── css/
│   │   ├── styles.css
│   │   └── dashboard.css
│   ├── js/
│   │   ├── script.js
│   │   ├── auth.js
│   │   └── dashboard.js
│   ├── assets/
│   │   ├── images/
│   │   └── icons/
│   ├── pages/
│   │   ├── login.html (actual: index.html)
│   │   ├── dashboard-admin.html
│   │   ├── dashboard-tech.html
│   │   ├── dashboard-client.html
│   │   ├── ordenes.html
│   │   ├── clientes.html
│   │   ├── equipos.html
│   │   ├── mantenimientos.html
│   │   └── cotizaciones.html
│   └── index.html (entrada principal)
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── ordenes.js
│   │   ├── clientes.js
│   │   ├── equipos.js
│   │   ├── mantenimientos.js
│   │   └── cotizaciones.js
│   ├── controllers/
│   │   └── [controladores de lógica]
│   ├── models/
│   │   └── [modelos de datos]
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   └── package.json
├── database/
│   └── schema.sql
├── docs/
│   ├── API.md
│   ├── DB_SCHEMA.md
│   └── USUARIOS_TEST.md
└── README.md
```

---

## Rutas y Vistas por Rol

### Administrador
| Ruta | Funcionalidad |
|------|--------------|
| `/admin/dashboard` | Dashboard con resumen general |
| `/admin/ordenes` | Crear, editar, eliminar órdenes |
| `/admin/clientes` | Gestión completa de clientes |
| `/admin/equipos` | Catálogo de equipos |
| `/admin/tecnicos` | Asignar tareas a técnicos |
| `/admin/reportes` | Reportes y estadísticas |

### Técnico
| Ruta | Funcionalidad |
|------|--------------|
| `/tech/dashboard` | Mis tareas asignadas |
| `/tech/ordenes` | Ver ordenes del día |
| `/tech/mantenimientos` | Registrar mantenimientos |
| `/tech/evidencias` | Subir fotos/evidencias |
| `/tech/historial` | Mi historial de trabajos |

### Cliente
| Ruta | Funcionalidad |
|------|--------------|
| `/client/dashboard` | Mis solicitudes |
| `/client/ordenes` | Ver estado de órdenes |
| `/client/equipos` | Mis equipos registrados |
| `/client/cotizaciones` | Solicitar y ver cotizaciones |
| `/client/historial` | Historial de mantenimientos |

---

## Base de Datos (MySQL)

### Tablas Principales
- `usuarios` - Registros de usuarios y roles
- `ordenes_mantenimiento` - Órdenes creadas
- `clientes` - Información de clientes
- `equipos_climatizacion` - Catálogo de equipos
- `tecnicos` - Datos de técnicos
- `mantenimientos` - Registros de trabajos realizados
- `cotizaciones` - Solicitudes y presupuestos
- `evidencias` - Fotos y documentos

---

## Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript Vanilla
- **Backend**: Node.js + Express
- **Base de Datos**: MySQL
- **Autenticación**: JWT o Sesiones
- **Hosting (optional)**: Vercel (frontend), Heroku (backend)

---

## Flujo de Desarrollo

1. ✅ **Login moderno** (completado)
2. ⏳ **Backend & Auth** (próximo)
3. ⏳ **Dashboards por rol**
4. ⏳ **Módulos principales**
5. ⏳ **Pruebas y deployment**

---

## Estado Actual
- Login frontend: **COMPLETO**
- Backend: **NO INICIADO**
- Base de datos: **NO INICIADO**
