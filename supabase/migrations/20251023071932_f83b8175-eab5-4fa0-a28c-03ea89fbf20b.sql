-- Remove default before changing enum
ALTER TABLE user_roles ALTER COLUMN role DROP DEFAULT;

-- Drop all dependent functions and policies
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;

-- Update the app_role enum
ALTER TYPE app_role RENAME TO app_role_old;
CREATE TYPE app_role AS ENUM ('admin', 'standard', 'vip');

-- Update the user_roles table to use the new enum
ALTER TABLE user_roles 
  ALTER COLUMN role TYPE app_role USING 
    CASE 
      WHEN role::text = 'admin' THEN 'admin'::app_role
      WHEN role::text = 'moderator' THEN 'vip'::app_role
      ELSE 'standard'::app_role
    END;

-- Set default value
ALTER TABLE user_roles 
  ALTER COLUMN role SET DEFAULT 'standard'::app_role;

DROP TYPE app_role_old;

-- Recreate the functions with new enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$function$;

-- Update the trigger function to use 'standard' as default role
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'standard');
  RETURN NEW;
END;
$function$;

-- Recreate all RLS policies
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;

CREATE POLICY "Admins can view all roles" 
ON user_roles FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert roles" 
ON user_roles FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles" 
ON user_roles FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles" 
ON user_roles FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own roles" 
ON user_roles FOR SELECT 
USING (auth.uid() = user_id);

-- Recreate profile policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Admins can view all profiles" 
ON profiles FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all profiles" 
ON profiles FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to check booking limits
CREATE OR REPLACE FUNCTION public.check_booking_limit(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  current_month_start date;
  booking_count integer;
BEGIN
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = _user_id
  LIMIT 1;

  IF user_role = 'admin' THEN
    RETURN true;
  END IF;

  IF user_role = 'standard' THEN
    RETURN false;
  END IF;

  IF user_role = 'vip' THEN
    current_month_start := date_trunc('month', CURRENT_DATE);
    
    SELECT COUNT(*) INTO booking_count
    FROM class_bookings
    WHERE user_id = _user_id
      AND created_at >= current_month_start;
    
    RETURN booking_count < 12;
  END IF;

  RETURN false;
END;
$$;

-- Update booking policy
DROP POLICY IF EXISTS "Users can create their own bookings" ON class_bookings;

CREATE POLICY "Users can create their own bookings" 
ON class_bookings FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND public.check_booking_limit(auth.uid())
);