# Guía de Hosting - Proyecto Climatización

## 🎯 Objetivo
Hacer el proyecto accesible desde cualquier lugar para que el profesor pueda evaluarlo.

---

## 🏆 Recomendación Principal: Railway.app

### Por qué Railway?
- ✅ **Fácil de usar** - Setup en minutos
- ✅ **MySQL incluido** - Base de datos gratuita
- ✅ **Despliegue automático** - Desde GitHub
- ✅ **Plan gratuito** suficiente para proyecto educativo
- ✅ **Compatible** con tu flujo actual (Laragon + MySQL Workbench)

### Pasos para Hosting

#### 1. Preparar el Proyecto
```bash
# Crear repositorio Git (si no tienes)
git init
git add .
git commit -m "Proyecto Climatización - Primera versión"
```

#### 2. Crear Cuenta en Railway
1. Ve a [railway.app](https://railway.app)
2. Regístrate con GitHub
3. Conecta tu repositorio

#### 3. Configurar Base de Datos
Railway automáticamente detectará tu `package.json` y creará:
- ✅ Servidor Node.js
- ✅ Base de datos MySQL
- ✅ Variables de entorno

#### 4. Variables de Entorno
Railway creará automáticamente las variables de BD. Solo necesitas:
```env
NODE_ENV=production
JWT_SECRET=tu_clave_secreta_segura
```

---

## 🔄 Alternativas Recomendadas

### PlanetScale (MySQL Moderno)
- ✅ MySQL compatible
- ✅ Escalabilidad automática
- ✅ Plan gratuito generoso
- ❌ Requiere más configuración

### Supabase (PostgreSQL/MySQL)
- ✅ Fácil de usar
- ✅ Dashboard visual
- ✅ Autenticación incluida
- ❌ PostgreSQL (no MySQL puro)

### Render
- ✅ Similar a Railway
- ✅ MySQL compatible
- ✅ Plan gratuito
- ❌ Menos intuitivo que Railway

---

## 📊 Comparación de Opciones

| Servicio | BD | Setup | Gratuito | Recomendado |
|----------|----|-------|----------|-------------|
| Railway | MySQL | ⭐⭐⭐⭐⭐ | ✅ | 🏆 **SÍ** |
| PlanetScale | MySQL | ⭐⭐⭐⭐ | ✅ | ⭐⭐⭐ |
| Supabase | PostgreSQL | ⭐⭐⭐⭐⭐ | ✅ | ⭐⭐⭐ |
| Render | MySQL | ⭐⭐⭐ | ✅ | ⭐⭐ |
| Heroku | Add-on | ⭐⭐ | ❌ | ⭐ |

---

## 🚀 Guía Paso a Paso con Railway

### Paso 1: Preparar Código
Asegúrate de que tu `backend/server.js` tenga:
```javascript
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor en puerto ${PORT}`);
});
```

### Paso 2: Crear Proyecto en Railway
1. **Crear cuenta** → [railway.app](https://railway.app)
2. **Nuevo proyecto** → "Deploy from GitHub"
3. **Seleccionar repo** → Tu repositorio del proyecto

### Paso 3: Configurar Base de Datos
Railway automáticamente:
- ✅ Crea instancia MySQL
- ✅ Configura variables de entorno
- ✅ Ejecuta `npm install`
- ✅ Despliega la aplicación

### Paso 4: Ejecutar Schema
Una vez desplegado, conecta a la BD de Railway:
```bash
# Usar las credenciales que Railway te da
mysql -h [HOST] -u [USER] -p [DATABASE] < database/schema.sql
```

### Paso 5: Acceder
Railway te dará una URL como:
```
https://tu-proyecto.up.railway.app
```

---

## 🔧 Desarrollo Local vs Producción

### Local (Laragon + MySQL Workbench)
- ✅ Desarrollo cómodo
- ✅ MySQL Workbench para gestión visual
- ✅ Control total

### Producción (Railway)
- ✅ Accesible desde cualquier lugar
- ✅ Base de datos en la nube
- ✅ Despliegue automático

### Flujo Recomendado
1. **Desarrollar localmente** con Laragon
2. **Subir cambios** a GitHub
3. **Railway despliega automáticamente**

---

## 💡 Consejos para el Proyecto

### Base de Datos
- Usa las variables de entorno de Railway
- El schema ya está optimizado
- Inserta usuarios de prueba después del despliegue

### Frontend
- Los archivos estáticos se sirven desde `/frontend`
- Railway detectará automáticamente la estructura

### Seguridad
- Cambia el `JWT_SECRET` en producción
- No subas credenciales reales a GitHub
- Usa `.env` para variables sensibles

---

## 🎯 Próximos Pasos

1. **Crear repositorio GitHub** (si no tienes)
2. **Subir el código actual**
3. **Crear cuenta Railway**
4. **Desplegar el proyecto**
5. **Configurar base de datos**
6. **Probar acceso desde diferentes dispositivos**

¿Quieres que te ayude con algún paso específico del despliegue? 🚀