-- Eliminar la restricción de month_start_date y hacerlo nullable con valor por defecto
ALTER TABLE class_schedules ALTER COLUMN month_start_date DROP NOT NULL;
ALTER TABLE class_schedules ALTER COLUMN month_start_date SET DEFAULT CURRENT_DATE;

-- Actualizar comentario de la tabla
COMMENT ON TABLE class_schedules IS 'Horarios semanales recurrentes de clases. Los horarios se repiten cada semana sin límite de tiempo.';