-- Update check_booking_limit function to give unlimited classes to full members
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

  -- Admins and full members can book unlimited classes
  IF user_role = 'admin' OR user_role = 'full' THEN
    RETURN true;
  END IF;

  -- Basic subscription cannot book classes
  IF user_role = 'basica' THEN
    RETURN false;
  END IF;

  -- basica_clases subscription: 12 classes per month limit
  IF user_role = 'basica_clases' THEN
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

  -- By default, do not allow bookings
  RETURN false;
END;
$function$;