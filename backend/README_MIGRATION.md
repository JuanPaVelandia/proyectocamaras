# Migración: Agregar Campos de Rango Horario

Este documento explica cómo ejecutar la migración para agregar los campos `time_start` y `time_end` a la tabla `rules`.

## ¿Qué hace esta migración?

Agrega dos nuevas columnas a la tabla `rules`:
- `time_start`: Hora de inicio para el rango horario de notificaciones (formato HH:MM)
- `time_end`: Hora de fin para el rango horario de notificaciones (formato HH:MM)

Ambas columnas son opcionales (nullable) y permiten configurar rangos horarios para las reglas de notificación.

## Cómo ejecutar la migración

### Opción 1: Script de migración automático (Recomendado)

#### Si ejecutas el backend directamente (sin Docker):

1. Asegúrate de estar en el directorio del backend:
   ```bash
   cd backend
   ```

2. Ejecuta el script de migración:
   ```bash
   python migrate_add_time_fields.py
   ```

#### Si ejecutas el backend con Docker:

1. Ejecuta el script dentro del contenedor:
   ```bash
   docker exec -it frigate_backend python migrate_add_time_fields.py
   ```

   O si prefieres ejecutarlo desde el directorio del proyecto:
   ```bash
   docker-compose exec backend python migrate_add_time_fields.py
   ```

El script:
- ✅ Verifica si las columnas ya existen (es seguro ejecutarlo múltiples veces)
- ✅ Agrega las columnas si no existen
- ✅ Funciona con PostgreSQL y SQLite
- ✅ Muestra mensajes claros del progreso

### Opción 2: Migración manual con SQL

Si prefieres ejecutar la migración manualmente:

#### Para PostgreSQL:
```sql
ALTER TABLE rules ADD COLUMN IF NOT EXISTS time_start VARCHAR(5);
ALTER TABLE rules ADD COLUMN IF NOT EXISTS time_end VARCHAR(5);
```

#### Para SQLite:
```sql
ALTER TABLE rules ADD COLUMN time_start VARCHAR(5);
ALTER TABLE rules ADD COLUMN time_end VARCHAR(5);
```

**Nota:** SQLite no soporta `IF NOT EXISTS` en `ALTER TABLE ADD COLUMN`, así que verifica primero si las columnas existen.

## Verificación

Después de ejecutar la migración, puedes verificar que las columnas se agregaron correctamente:

### Con PostgreSQL:
```sql
\d rules
```

### Con SQLite:
```sql
.schema rules
```

O desde Python:
```python
from app.db.session import engine
from sqlalchemy import inspect

inspector = inspect(engine)
columns = [col['name'] for col in inspector.get_columns('rules')]
print('time_start' in columns)  # Debe ser True
print('time_end' in columns)    # Debe ser True
```

## Rollback (Revertir cambios)

Si necesitas revertir la migración (eliminar las columnas):

### PostgreSQL:
```sql
ALTER TABLE rules DROP COLUMN IF EXISTS time_start;
ALTER TABLE rules DROP COLUMN IF EXISTS time_start;
```

### SQLite:
SQLite no soporta `DROP COLUMN` directamente. Necesitarías recrear la tabla.

## Notas importantes

- ⚠️ **Backup**: Siempre haz un backup de tu base de datos antes de ejecutar migraciones
- ✅ **Seguro**: El script es idempotente, puedes ejecutarlo múltiples veces sin problemas
- 🔄 **Compatibilidad**: Funciona con bases de datos existentes y nuevas

## Solución de problemas

### Error: "La tabla 'rules' no existe"
- Asegúrate de que la base de datos esté inicializada
- Ejecuta primero `python main.py` para crear las tablas base

### Error de conexión
- Verifica que la variable `DATABASE_URL` en `.env` sea correcta
- Para PostgreSQL, asegúrate de que el servicio esté corriendo
- Para SQLite, verifica que el archivo `events.db` exista o tenga permisos de escritura

### Las columnas no aparecen después de la migración
- Verifica que la migración se ejecutó sin errores
- Reinicia el backend para que SQLAlchemy reconozca los cambios
- Si usas Docker, puede ser necesario reconstruir el contenedor

