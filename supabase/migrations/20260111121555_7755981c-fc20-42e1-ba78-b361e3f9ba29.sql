-- Eliminar el constraint único que impide reutilizar los códigos de acceso
DROP INDEX IF EXISTS idx_unique_access_code;

-- Verificar si existe como constraint y eliminarlo también
ALTER TABLE single_class_purchases DROP CONSTRAINT IF EXISTS idx_unique_access_code;