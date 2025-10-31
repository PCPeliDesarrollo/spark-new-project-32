-- Actualizar el enum de roles para los nuevos tipos de suscripción
-- Eliminar funciones con CASCADE para eliminar también las políticas que dependen de ellas
DROP FUNCTION IF EXISTS has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS check_booking_limit(uuid) CASCADE;

-- Eliminar el valor por defecto temporalmente
ALTER TABLE user_roles ALTER COLUMN role DROP DEFAULT;

-- Actualizar el enum de roles
ALTER TYPE app_role RENAME TO app_role_old;
CREATE TYPE app_role AS ENUM ('admin', 'basica', 'basica_clases', 'full');

-- Actualizar la columna de roles con el nuevo tipo
ALTER TABLE user_roles ALTER COLUMN role TYPE app_role USING 
  CASE 
    WHEN role::text = 'standard' THEN 'basica'::app_role
    WHEN role::text = 'vip' THEN 'basica_clases'::app_role
    ELSE role::text::app_role
  END;

-- Establecer el nuevo valor por defecto
ALTER TABLE user_roles ALTER COLUMN role SET DEFAULT 'basica'::app_role;

-- Eliminar el tipo antiguo
DROP TYPE app_role_old;

-- Recrear la función has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Recrear la función get_user_role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Recrear la función check_booking_limit con la nueva lógica
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
    
    SELECT COUNT(*) INTO booking_count
    FROM class_bookings
    WHERE user_id = _user_id
      AND created_at >= current_month_start;
    
    RETURN booking_count < 12;
  END IF;

  -- Por defecto, no permitir reservas
  RETURN false;
END;
$$;

-- Recrear políticas RLS
CREATE POLICY "Users can create their own bookings" 
ON class_bookings 
FOR INSERT 
WITH CHECK ((auth.uid() = user_id) AND check_booking_limit(auth.uid()) AND (NOT is_user_blocked(auth.uid())));

CREATE POLICY "Users can view own bookings" 
ON class_bookings 
FOR SELECT 
USING (
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN true
    ELSE ((auth.uid() = user_id) AND (NOT is_user_blocked(auth.uid())))
  END
);

CREATE POLICY "Admins can view all profiles" 
ON profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all profiles" 
ON profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all roles" 
ON user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert roles" 
ON user_roles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles" 
ON user_roles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles" 
ON user_roles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert schedules" 
ON class_schedules 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update schedules" 
ON class_schedules 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete schedules" 
ON class_schedules 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert classes" 
ON classes 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update classes" 
ON classes 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete classes" 
ON classes 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all access logs" 
ON access_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1
  FROM profiles
  WHERE (profiles.id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role)
));