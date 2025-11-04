-- Add class_date column to class_bookings to store specific booking date
ALTER TABLE public.class_bookings
ADD COLUMN class_date date NOT NULL DEFAULT CURRENT_DATE;

-- Create unique constraint to prevent double booking same class on same date
ALTER TABLE public.class_bookings
ADD CONSTRAINT unique_user_schedule_date UNIQUE (user_id, schedule_id, class_date);

-- Drop the old trigger and function, we'll recreate with date awareness
DROP TRIGGER IF EXISTS manage_booking_status_trigger ON public.class_bookings;
DROP TRIGGER IF EXISTS promote_from_waitlist_trigger ON public.class_bookings;
DROP TRIGGER IF EXISTS notify_low_class_count_trigger ON public.class_bookings;

-- Recreate manage_booking_status function with date awareness
CREATE OR REPLACE FUNCTION public.manage_booking_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_confirmed_count integer;
  schedule_capacity integer;
  next_position integer;
  class_name text;
  class_time time;
BEGIN
  -- Get the schedule's max capacity
  SELECT max_capacity INTO schedule_capacity
  FROM class_schedules
  WHERE id = NEW.schedule_id;

  -- Count current confirmed bookings for this specific date
  SELECT COUNT(*) INTO current_confirmed_count
  FROM class_bookings
  WHERE schedule_id = NEW.schedule_id 
    AND class_date = NEW.class_date
    AND status = 'confirmed'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- If inserting a new booking
  IF TG_OP = 'INSERT' THEN
    IF current_confirmed_count < schedule_capacity THEN
      -- There's space, confirm the booking
      NEW.status := 'confirmed';
      NEW.position := NULL;
    ELSE
      -- Class is full, add to waitlist
      SELECT COALESCE(MAX(position), 0) + 1 INTO next_position
      FROM class_bookings
      WHERE schedule_id = NEW.schedule_id 
        AND class_date = NEW.class_date 
        AND status = 'waitlist';
      
      NEW.status := 'waitlist';
      NEW.position := next_position;

      -- Get class details for notification
      SELECT c.name, cs.start_time
      INTO class_name, class_time
      FROM class_schedules cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.id = NEW.schedule_id;

      -- Create notification for waitlisted user
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        NEW.user_id,
        'En lista de reserva',
        'Has quedado en lista de reserva para la clase de ' || class_name || ' del ' || 
        to_char(NEW.class_date, 'DD/MM/YYYY') || ' a las ' || 
        to_char(class_time, 'HH24:MI') || '. Te avisaremos si hay plazas disponibles.',
        'warning'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recreate promote_from_waitlist function with date awareness
CREATE OR REPLACE FUNCTION public.promote_from_waitlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_waitlist_id uuid;
  next_waitlist_user_id uuid;
  schedule_capacity integer;
  current_confirmed_count integer;
  class_name text;
  class_time time;
BEGIN
  -- Only process if a confirmed booking was deleted
  IF OLD.status = 'confirmed' THEN
    -- Get schedule capacity
    SELECT max_capacity INTO schedule_capacity
    FROM class_schedules
    WHERE id = OLD.schedule_id;

    -- Count current confirmed bookings for this specific date
    SELECT COUNT(*) INTO current_confirmed_count
    FROM class_bookings
    WHERE schedule_id = OLD.schedule_id 
      AND class_date = OLD.class_date
      AND status = 'confirmed';

    -- If there's now space and there are people on waitlist for this date
    IF current_confirmed_count < schedule_capacity THEN
      -- Get the first person on waitlist for this specific date
      SELECT cb.id, cb.user_id INTO next_waitlist_id, next_waitlist_user_id
      FROM class_bookings cb
      WHERE cb.schedule_id = OLD.schedule_id 
        AND cb.class_date = OLD.class_date
        AND cb.status = 'waitlist'
      ORDER BY cb.position ASC
      LIMIT 1;

      -- Promote them to confirmed
      IF next_waitlist_id IS NOT NULL THEN
        UPDATE class_bookings
        SET status = 'confirmed', position = NULL
        WHERE id = next_waitlist_id;

        -- Get class details for notification
        SELECT c.name, cs.start_time
        INTO class_name, class_time
        FROM class_schedules cs
        JOIN classes c ON c.id = cs.class_id
        WHERE cs.id = OLD.schedule_id;

        -- Create notification for promoted user
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
          next_waitlist_user_id,
          '¡Plaza confirmada!',
          'Has conseguido plaza en la clase de ' || class_name || ' del ' || 
          to_char(OLD.class_date, 'DD/MM/YYYY') || ' a las ' || 
          to_char(class_time, 'HH24:MI') || '. ¡Te esperamos!',
          'success'
        );

        -- Reorder remaining waitlist for this date
        UPDATE class_bookings
        SET position = position - 1
        WHERE schedule_id = OLD.schedule_id 
          AND class_date = OLD.class_date
          AND status = 'waitlist'
          AND position > (SELECT position FROM class_bookings WHERE id = next_waitlist_id);
      END IF;
    END IF;
  END IF;

  RETURN OLD;
END;
$function$;

-- Recreate notify_low_class_count with monthly awareness
CREATE OR REPLACE FUNCTION public.notify_low_class_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
  current_month_start date;
  booking_count integer;
  user_full_name text;
  remaining_classes integer;
BEGIN
  -- Solo procesar bookings confirmados
  IF NEW.status != 'confirmed' THEN
    RETURN NEW;
  END IF;

  -- Obtener el rol del usuario
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = NEW.user_id
  LIMIT 1;

  -- Solo aplicar a usuarios con límite de clases
  IF user_role = 'basica_clases' OR user_role = 'full' THEN
    current_month_start := date_trunc('month', CURRENT_DATE);
    
    -- Contar las reservas confirmadas del mes (by date, not schedule)
    SELECT COUNT(*) INTO booking_count
    FROM class_bookings
    WHERE user_id = NEW.user_id
      AND class_date >= current_month_start
      AND class_date < (current_month_start + INTERVAL '1 month')
      AND status = 'confirmed';
    
    remaining_classes := 12 - booking_count;
    
    -- Si quedan exactamente 3 clases, notificar al usuario
    IF remaining_classes = 3 THEN
      SELECT full_name INTO user_full_name
      FROM profiles
      WHERE id = NEW.user_id;
      
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (
        NEW.user_id,
        '¡Atención! Quedan 3 clases',
        'Solo te quedan 3 clases hasta la próxima renovación mensual. Planifica bien tus entrenamientos.',
        'warning'
      );
      
      -- Notificar a todos los admins
      INSERT INTO notifications (user_id, title, message, type)
      SELECT ur.user_id, 
        'Usuario con 3 clases restantes',
        user_full_name || ' solo tiene 3 clases disponibles este mes.',
        'info'
      FROM user_roles ur
      WHERE ur.role = 'admin';
    END IF;
    
    -- Si no quedan clases (llegó al límite), notificar
    IF remaining_classes = 0 THEN
      SELECT full_name INTO user_full_name
      FROM profiles
      WHERE id = NEW.user_id;
      
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (
        NEW.user_id,
        'Límite de clases alcanzado',
        'Has alcanzado tu límite de 12 clases este mes. Para seguir reservando, espera a la próxima renovación.',
        'warning'
      );
      
      -- Notificar a todos los admins
      INSERT INTO notifications (user_id, title, message, type)
      SELECT ur.user_id,
        'Usuario sin clases disponibles',
        user_full_name || ' ha alcanzado su límite de 12 clases este mes.',
        'warning'
      FROM user_roles ur
      WHERE ur.role = 'admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recreate all triggers
CREATE TRIGGER manage_booking_status_trigger
BEFORE INSERT ON public.class_bookings
FOR EACH ROW
EXECUTE FUNCTION public.manage_booking_status();

CREATE TRIGGER promote_from_waitlist_trigger
AFTER DELETE ON public.class_bookings
FOR EACH ROW
EXECUTE FUNCTION public.promote_from_waitlist();

CREATE TRIGGER notify_low_class_count_trigger
AFTER INSERT ON public.class_bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_low_class_count();

-- Update check_booking_limit function to count by dates not schedules
CREATE OR REPLACE FUNCTION public.check_booking_limit(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
  current_month_start date;
  booking_count integer;
BEGIN
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = _user_id
  LIMIT 1;

  -- Los admins pueden reservar sin límite
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Suscripción básica NO puede reservar clases
  IF user_role = 'basica' THEN
    RETURN false;
  END IF;

  -- Suscripción básica_clases y full: límite de 12 clases al mes
  IF user_role = 'basica_clases' OR user_role = 'full' THEN
    current_month_start := date_trunc('month', CURRENT_DATE);
    
    -- Count confirmed bookings by date in current month
    SELECT COUNT(*) INTO booking_count
    FROM class_bookings
    WHERE user_id = _user_id
      AND class_date >= current_month_start
      AND class_date < (current_month_start + INTERVAL '1 month')
      AND status = 'confirmed';
    
    RETURN booking_count < 12;
  END IF;

  -- Por defecto, no permitir reservas
  RETURN false;
END;
$function$;