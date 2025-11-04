-- Modificar la tabla class_schedules para usar month_start_date en lugar de week_start_date
ALTER TABLE class_schedules 
RENAME COLUMN week_start_date TO month_start_date;

-- Actualizar los valores existentes para que apunten al inicio del mes
UPDATE class_schedules 
SET month_start_date = date_trunc('month', month_start_date)::date;

-- Actualizar el comentario de la columna
COMMENT ON COLUMN class_schedules.month_start_date IS 'Primer día del mes al que pertenece este horario';

-- Recrear la función para duplicar horarios mensualmente
DROP FUNCTION IF EXISTS duplicate_schedules_for_next_week();

CREATE OR REPLACE FUNCTION duplicate_schedules_for_next_month()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_month_start date;
  next_month_start date;
BEGIN
  -- Obtener el primer día del mes actual
  current_month_start := date_trunc('month', CURRENT_DATE)::date;
  
  -- Obtener el primer día del mes siguiente
  next_month_start := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date;
  
  -- Verificar si ya existen horarios para el mes siguiente
  IF EXISTS (
    SELECT 1 FROM class_schedules 
    WHERE month_start_date = next_month_start
  ) THEN
    RAISE NOTICE 'Los horarios para el próximo mes ya existen';
    RETURN;
  END IF;
  
  -- Duplicar los horarios del mes actual para el mes siguiente
  INSERT INTO class_schedules (
    class_id,
    day_of_week,
    start_time,
    duration_minutes,
    max_capacity,
    month_start_date
  )
  SELECT 
    class_id,
    day_of_week,
    start_time,
    duration_minutes,
    max_capacity,
    next_month_start
  FROM class_schedules
  WHERE month_start_date = current_month_start;
  
  RAISE NOTICE 'Horarios duplicados para el mes que empieza el %', next_month_start;
END;
$$;

-- Recrear la función para resetear reservas mensualmente
DROP FUNCTION IF EXISTS reset_monthly_bookings();

CREATE OR REPLACE FUNCTION reset_monthly_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  last_month_start date;
BEGIN
  -- Obtener el primer día del mes pasado
  last_month_start := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date;
  
  -- Eliminar las reservas del mes pasado
  DELETE FROM class_bookings
  WHERE schedule_id IN (
    SELECT id FROM class_schedules
    WHERE month_start_date = last_month_start
  );
  
  RAISE NOTICE 'Reservas del mes pasado eliminadas (mes que empezaba el %)', last_month_start;
END;
$$;