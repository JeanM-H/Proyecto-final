# Instrucciones para Actualizar Credenciales de Prueba en Supabase

## Problema
Es posible que los usuarios de prueba en Supabase no tengan las contraseñas correctas o no existan. Esto causa el error "Credenciales inválidas" al intentar iniciar sesión.

## Credenciales de Prueba Correctas

| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@climatizacion.com | Admin123 | Administrador |
| tecnico@climatizacion.com | Tecnico123 | Técnico |
| cliente@example.com | Cliente123 | Cliente |

## Pasos para Actualizar en Supabase

1. Ve a https://supabase.com y accede a tu proyecto
2. En el panel lateral, ve a **SQL Editor**
3. Haz clic en **+ New Query** o abre una query SQL vacía
4. Copia y pega todo el contenido de `database/update_test_users.sql`
5. Haz clic en **Run** (o presiona Ctrl+Enter)
6. Verifica que los usuarios aparezcan en la tabla usuarios

## SQL Simplificado (si prefieres hacerlo manualmente)

```sql
-- Actualizar o insertar usuarios
INSERT INTO usuarios (email, password, nombre, rol, estado) VALUES
('admin@climatizacion.com', '$2a$10$FFqWR4QY1Lj9bMhKVqjus.OoKuDjGu3r9L.DB/eOoC.gHBBD0Y4l.', 'Juan Administrador', 'Administrador', true),
('tecnico@climatizacion.com', '$2a$10$yFDC1NUH.YnhLi9p/bRTj.W3r/SmTa1GMjQVMEcJ5FEoGkvYyGxx.', 'Carlos Técnico', 'Técnico', true),
('cliente@example.com', '$2a$10$7rMhCFAM9LLs4YvIYoNXCuy6cs8.t2t3rGSHpsOOtEjXtT7pvo/mG', 'María Cliente', 'Cliente', true)
ON CONFLICT(email) DO UPDATE SET password = EXCLUDED.password;
```

## Prueba Local

Si quieres probar localmente primero:

```bash
npm start
# O usa SQL directamente si tienes MySQL
mysql -u root -p climatizacion_db < database/seed.sql
```

## Después de Actualizar

Una vez actualicemos los usuarios en Supabase, intenta iniciar sesión con:
- **Email**: admin@climatizacion.com
- **Contraseña**: Admin123
- **Rol**: Administrador

El token JWT debería generarse y te mantendrá en el dashboard.
