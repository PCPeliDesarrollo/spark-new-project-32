-- Create function to duplicate schedules for next week
CREATE OR REPLACE FUNCTION duplicate_schedules_for_next_week()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_week_start date;
  next_week_start date;
BEGIN
  -- Get current week's Monday
  current_week_start := date_trunc('week', CURRENT_DATE)::date + INTERVAL '1 day';
  
  -- Get next week's Monday
  next_week_start := current_week_start + INTERVAL '7 days';
  
  -- Check if schedules for next week already exist
  IF EXISTS (
    SELECT 1 FROM class_schedules 
    WHERE week_start_date = next_week_start
  ) THEN
    RAISE NOTICE 'Schedules for next week already exist';
    RETURN;
  END IF;
  
  -- Duplicate current week's schedules for next week
  INSERT INTO class_schedules (
    class_id,
    day_of_week,
    start_time,
    duration_minutes,
    max_capacity,
    week_start_date
  )
  SELECT 
    class_id,
    day_of_week,
    start_time,
    duration_minutes,
    max_capacity,
    next_week_start
  FROM class_schedules
  WHERE week_start_date = current_week_start;
  
  RAISE NOTICE 'Schedules duplicated for week starting %', next_week_start;
END;
$$;