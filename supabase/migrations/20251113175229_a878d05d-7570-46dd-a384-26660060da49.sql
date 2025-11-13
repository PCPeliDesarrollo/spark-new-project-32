-- Actualizar la función notify_low_class_count para no notificar a usuarios full/admin
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

  -- NO notificar a usuarios full o admin (tienen clases ilimitadas)
  IF user_role = 'full' OR user_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Solo aplicar a usuarios con límite de clases (basica_clases)
  IF user_role = 'basica_clases' THEN
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