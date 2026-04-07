# Sistema de Gestión de Mantenimiento de Climatización 🌬️

## Descripción
Aplicación web desarrollada para optimizar la gestión de operaciones en empresas del sector de climatización. Permite gestionar órdenes de mantenimiento, clientes, equipos, técnicos, cotizaciones y captura de evidencias.

---

## Características

✅ **Autenticación Multi-Rol**
- Administrador: Control total del sistema
- Técnico: Gestión de tareas y registros
- Cliente: Consulta de servicios y solicitudes

✅ **Módulos**
- Gestión de órdenes de mantenimiento (preventivo y correctivo)
- Administración de clientes y equipos
- Registro de mantenimientos realizados
- Cotizaciones y presupuestos
- Trazabilidad de técnicos
- Captura de evidencias (fotos/documentos)
- Dashboards analíticos

---

## Tecnologías

### Frontend
- HTML5
- CSS3 (Diseño moderno y responsive)
- JavaScript Vanilla
- *Próximamente*: React (opcional)

### Backend
- Node.js
- Express.js
- MySQL
- JWT (Autenticación)
- bcryptjs (Encriptación de contraseñas)

---

## Estructura del Proyecto

```
proyecto-final/
├── frontend/
│   ├── index.html           # Página de login
│   ├── css/
│   │   └── styles.css       # Estilos globales
│   ├── js/
│   │   ├── script.js        # Lógica principal
│   │   └── auth.js          # Autenticación (próximo)
│   ├── pages/               # Páginas adicionales
│   └── assets/              # Imágenes y recursos
├── backend/
│   ├── server.js            # Servidor principal
│   ├── package.json         # Dependencias Node
│   ├── config/
│   │   └── db.js            # Configuración BD
│   ├── routes/              # Rutas API
│   ├── controllers/         # Lógica de negocio
│   ├── models/              # Modelos de datos
│   └── middleware/          # Middleware (auth, etc)
├── database/
│   └── schema.sql           # Estructura de BD
├── docs/
│   ├── API.md               # Documentación API
│   ├── DB_SCHEMA.md         # Esquema BD
│   └── USUARIOS_TEST.md     # Credenciales prueba
├── PLAN_PROYECTO.md         # Roadmap y fases
└── README.md
```

---

## 🚀 Cómo Ejecutar

### Requisitos
- Node.js >= 14.0.0
- MySQL >= 5.7
- npm o yarn

### Opción 1: Desarrollo Local

#### Frontend
```bash
cd frontend
# Abrir index.html en navegador o usar servidor local
python -m http.server 8000  # Con Python 3
# O
npx http-server            # Con Node
```

#### Backend
```bash
cd backend
npm install
cp .env.example .env       # Configurar credenciales BD
npm run dev                # Desarrollo con nodemon
```

#### Base de Datos
```bash
# Crear BD con Laragon/MySQL Workbench
mysql -u root -p < ../database/schema.sql
```

### Opción 2: Hosting en Producción (Recomendado)

#### 🚂 Railway.app (Fácil y Rápido)
1. **Crear cuenta** → [railway.app](https://railway.app)
2. **Conectar GitHub** → Subir tu código
3. **Desplegar** → Railway configura automáticamente BD MySQL + Node.js
4. **Acceder** → URL pública generada

**Ventajas:**
- ✅ Despliegue automático desde GitHub
- ✅ Base de datos MySQL gratuita incluida
- ✅ Accesible desde cualquier lugar
- ✅ Perfecto para evaluación del profesor

**Ver guía completa:** [GUIA_HOSTING.md](./GUIA_HOSTING.md)

#### Alternativas
- **PlanetScale** - MySQL moderno en la nube
- **Supabase** - PostgreSQL con dashboard visual
- **Render** - Similar a Railway

---

## 📝 Usuarios de Prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador | admin@climatizacion.com | Admin123 |
| Técnico | tecnico@climatizacion.com | Tecnico123 |
| Cliente | cliente@example.com | Cliente123 |

---

## 📚 Documentación

- **[PLAN_PROYECTO.md](./PLAN_PROYECTO.md)** - Roadmap y fases
- **[docs/API.md](./docs/API.md)** - Endpoints de la API
- **[docs/DB_SCHEMA.md](./database/schema.sql)** - Estructura de base de datos
- **[docs/USUARIOS_TEST.md](./docs/USUARIOS_TEST.md)** - Credenciales de prueba

---

## 🎯 Roadmap

### Fase 1: Autenticación (EN PROGRESO)
- [x] Diseño login frontend
- [ ] Backend autenticación
- [ ] Base de datos usuarios
- [ ] Sistema de sesiones

### Fase 2: Dashboards (PRÓXIMO)
- [ ] Dashboard Administrador
- [ ] Dashboard Técnico
- [ ] Dashboard Cliente
- [ ] Navegación por roles

### Fase 3: Módulos Principales
- [ ] Órdenes de mantenimiento
- [ ] Gestión de clientes
- [ ] Catálogo de equipos
- [ ] Registro de mantenimientos

### Fase 4: Funcionalidades Avanzadas
- [ ] Cotizaciones
- [ ] Subida de evidencias
- [ ] Reportes y gráficos
- [ ] Notificaciones

---

## 🤝 Contribuciones

Este proyecto es parte del programa ADSO. Los cambios deben seguir:
- Convenciones de código descritas en el proyecto
- Crear ramas para nuevas features
- Hacer commits descriptivos

---

## 📧 Contacto

**Autor**: Equipo ADSO  
**Fecha Inicio**: Abril 2026  
**Última Actualización**: Abril 6, 2026

---

## 📄 Licencia

ISC