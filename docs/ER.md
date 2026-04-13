# Diagrama Entidad-Relación (ER)
## Sistema de Gestión de Mantenimiento de Climatización

```mermaid
erDiagram
    usuarios {
        BIGINT id PK
        TEXT email UK
        TEXT password
        TEXT nombre
        TEXT rol
        BOOLEAN estado
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
        BIGINT created_by FK
        BIGINT updated_by FK
    }

    clientes {
        BIGINT id PK
        BIGINT usuario_id FK UK
        TEXT empresa
        TEXT telefono
        TEXT direccion
        TEXT ciudad
        TEXT pais
        TIMESTAMPTZ created_at
    }

    tecnicos {
        BIGINT id PK
        BIGINT usuario_id FK UK
        TEXT especialidad
        BOOLEAN disponible
        TEXT telefono_contacto
        TIMESTAMPTZ created_at
    }

    equipos_climatizacion {
        BIGINT id PK
        BIGINT cliente_id FK
        TEXT marca
        TEXT modelo
        TEXT serial UK
        TEXT tipo
        DATE fecha_instalacion
        TEXT ubicacion
        TEXT estado
        TIMESTAMPTZ created_at
    }

    ordenes_mantenimiento {
        BIGINT id PK
        BIGINT cliente_id FK
        BIGINT equipo_id FK
        BIGINT tecnico_id FK
        TEXT tipo
        TEXT descripcion
        TEXT estado
        TIMESTAMPTZ fecha_programada
        TIMESTAMPTZ fecha_completada
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
        BIGINT created_by FK
        BIGINT updated_by FK
    }

    mantenimientos {
        BIGINT id PK
        BIGINT orden_id FK
        BIGINT tecnico_id FK
        TEXT notas
        INT tiempo_dedicado
        TEXT repuestos_utilizados
        TIMESTAMPTZ fecha_inicio
        TIMESTAMPTZ fecha_fin
        TEXT observaciones
        TIMESTAMPTZ created_at
        BIGINT created_by FK
        BIGINT updated_by FK
    }

    repuestos {
        BIGINT id PK
        TEXT nombre
        TEXT descripcion
        DECIMAL precio
        INT stock
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
        BIGINT created_by FK
        BIGINT updated_by FK
    }

    detalle_repuestos {
        BIGINT id PK
        BIGINT mantenimiento_id FK
        BIGINT repuesto_id FK
        INT cantidad
        TIMESTAMPTZ created_at
    }

    cotizaciones {
        BIGINT id PK
        BIGINT cliente_id FK
        TEXT descripcion
        DECIMAL monto_estimado
        TEXT estado
        TIMESTAMPTZ fecha_solicitud
        TIMESTAMPTZ fecha_respuesta
        TIMESTAMPTZ created_at
        BIGINT created_by FK
        BIGINT updated_by FK
    }

    evidencias {
        BIGINT id PK
        BIGINT mantenimiento_id FK
        TEXT archivo_nombre
        TEXT archivo_ruta
        TEXT tipo
        TEXT descripcion
        TIMESTAMPTZ created_at
        BIGINT created_by FK
    }

    usuarios ||--o{ usuarios : "created_by/updated_by"
    usuarios ||--|| clientes : "1:1"
    usuarios ||--|| tecnicos : "1:1"
    clientes ||--o{ equipos_climatizacion : "1:N"
    clientes ||--o{ ordenes_mantenimiento : "1:N"
    clientes ||--o{ cotizaciones : "1:N"
    tecnicos ||--o{ ordenes_mantenimiento : "1:N"
    tecnicos ||--o{ mantenimientos : "1:N"
    equipos_climatizacion ||--o{ ordenes_mantenimiento : "1:N"
    ordenes_mantenimiento ||--|| mantenimientos : "1:1"
    mantenimientos ||--o{ evidencias : "1:N"
    mantenimientos ||--o{ detalle_repuestos : "1:N"
    repuestos ||--o{ detalle_repuestos : "1:N"
```

## Leyenda de Relaciones

- **||--||**: Uno a uno (1:1)
- **||--o{**: Uno a muchos (1:N)
- **}o--o{**: Muchos a muchos (N:M) - implementado via tabla intermedia

## Entidades y Atributos

### Entidades Principales
1. **usuarios**: Gestión de autenticación y roles
2. **clientes**: Información empresarial de clientes
3. **tecnicos**: Perfiles de técnicos especializados
4. **equipos_climatizacion**: Inventario de equipos
5. **ordenes_mantenimiento**: Solicitudes de mantenimiento
6. **mantenimientos**: Registros de trabajos realizados
7. **repuestos**: Catálogo de piezas y materiales
8. **detalle_repuestos**: Relación many-to-many repuestos-mantenimientos
9. **cotizaciones**: Presupuestos y estimaciones
10. **evidencias**: Fotos y documentos de mantenimientos

### Atributos Clave
- **PK**: Primary Key (clave primaria)
- **FK**: Foreign Key (clave foránea)
- **UK**: Unique Key (clave única)

## Notas Importantes

- La tabla `detalle_repuestos` implementa la relación many-to-many entre `mantenimientos` y `repuestos`
- Los campos `created_by` y `updated_by` en todas las tablas principales permiten auditoría completa
- Las relaciones están protegidas con `ON DELETE CASCADE` donde corresponde
- Todos los índices están optimizados para las consultas más frecuentes