-- Update check_booking_limit function to give basica_clases unlimited classes
CREATE OR REPLACE FUNCTION public.check_booking_limit(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
BEGIN
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = _user_id
  LIMIT 1;

  -- Admins, full members, and basica_clases can book unlimited classes
  IF user_role = 'admin' OR user_role = 'full' OR user_role = 'basica_clases' THEN
    RETURN true;
  END IF;

  -- Basic subscription (solo máquinas) cannot book classes
  IF user_role = 'basica' THEN
    RETURN false;
  END IF;

  -- By default, do not allow bookings
  RETURN false;
END;
$function$;

-- Update notify_low_class_count to not send notifications (no more class limits)
CREATE OR REPLACE FUNCTION public.notify_low_class_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- No class limits anymore for basica_clases, so no notifications needed
  -- This function is kept for backwards compatibility but does nothing
  RETURN NEW;
END;
$function$;