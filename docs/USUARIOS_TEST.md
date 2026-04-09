# Usuarios de Prueba

## Credenciales para Login

| Rol | Email | Contraseña | Estado |
|-----|-------|------------|--------|
| Administrador | admin@climatizacion.com | Admin123 | ✅ Activo |
| Técnico | tecnico@climatizacion.com | Tecnico123 | ✅ Activo |
| Cliente | cliente@example.com | Cliente123 | ✅ Activo |

---

## ⚠️ Importante: Contraseñas en Producción

### Para Desarrollo Local
Las contraseñas están en texto plano en el archivo `insert_test_data.sql` para facilitar las pruebas.

### Para Producción (Railway)
**NO uses las contraseñas de arriba directamente.** Debes:

1. **Generar hashes bcrypt** antes de insertar:
```bash
# Instalar bcryptjs globalmente
npm install -g bcryptjs

# Generar hash para Admin123
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('Admin123', 10).then(h => console.log(h))"
```

2. **Actualizar `database/seed.sql`** con los hashes generados

3. **Ejecutar el seed** en tu base de datos de Railway

### Nuevos Usuarios Creados por Admin
- **Contraseña temporal:** Generada automáticamente como `NombreApellidoXXX` donde XXX son 3 dígitos aleatorios.
- **Primer login:** Redirigido a `change-password.html` para cambiar la contraseña.
- **Roles:** Cliente o Técnico, asignado por el admin.

---

## Script para Generar Hashes (Node.js)

Crea un archivo `generate-hashes.js`:
```javascript
const bcrypt = require('bcryptjs');

const passwords = ['Admin123', 'Tecnico123', 'Cliente123'];

passwords.forEach(async (pwd) => {
    const hash = await bcrypt.hash(pwd, 10);
    console.log(`${pwd}: ${hash}`);
});
```

Ejecuta:
```bash
cd backend
node generate-hashes.js
```

---

## Instrucciones para crear usuarios en la BD

### Opción 1: Desarrollo Local (Laragon/MySQL Workbench)
```sql
-- Ejecutar en MySQL Workbench
SOURCE database/schema.sql;
SOURCE database/seed.sql;
```

### Opción 2: Producción (Railway)
1. **Desplegar proyecto** en Railway
2. **Conectar a BD** usando las credenciales de Railway
3. **Ejecutar scripts**:
```bash
# Conectar a MySQL de Railway
mysql -h [HOST] -u [USER] -p [DATABASE] < database/schema.sql
mysql -h [HOST] -u [USER] -p [DATABASE] < database/seed.sql
```

### Opción 3: Desde la aplicación (Próximamente)
Una vez implementada la autenticación, podrás crear usuarios desde la interfaz.

---

## Estructura de Datos de Prueba

### Administrador
- **Nombre**: Juan Administrador
- **Email**: admin@climatizacion.com
- **Rol**: Administrador
- **Acceso**: Control total del sistema

### Técnico
- **Nombre**: Carlos Técnico
- **Email**: tecnico@climatizacion.com
- **Rol**: Técnico
- **Especialidad**: Climatización Industrial
- **Teléfono**: 3019876543

### Cliente
- **Nombre**: María Cliente
- **Email**: cliente@example.com
- **Rol**: Cliente
- **Empresa**: Empresa Ejemplo S.A.
- **Teléfono**: 3001234567
- **Dirección**: Calle 123 #45-67, Bogotá, Colombia

### Equipos de Prueba
- **Samsung AC-2000** (Aire Acondicionado) - Oficina Principal
- **LG HVAC-5000** (Ventilación) - Sala de Servidores

### Órdenes de Prueba
- **Orden #1**: Mantenimiento preventivo mensual asignado al técnico Carlos

---

## 🔐 Seguridad

- **Nunca subas** contraseñas reales a GitHub
- **Usa .env** para variables sensibles
- **Cambia JWT_SECRET** en producción
- **Hashea todas las contraseñas** antes de almacenar
