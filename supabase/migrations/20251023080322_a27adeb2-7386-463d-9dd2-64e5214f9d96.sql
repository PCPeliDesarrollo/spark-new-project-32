-- Add blocked status to profiles
ALTER TABLE public.profiles 
ADD COLUMN blocked boolean DEFAULT false NOT NULL;

-- Add email column to profiles for easier access
ALTER TABLE public.profiles 
ADD COLUMN email text;

-- Create function to check if user is blocked
CREATE OR REPLACE FUNCTION public.is_user_blocked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(blocked, false)
  FROM public.profiles
  WHERE id = _user_id
$$;

-- Update class_bookings INSERT policy to block bookings from blocked users
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.class_bookings;
CREATE POLICY "Users can create their own bookings" 
ON public.class_bookings 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND check_booking_limit(auth.uid())
  AND NOT is_user_blocked(auth.uid())
);

-- Update class_bookings DELETE policy to block deletions from blocked users
DROP POLICY IF EXISTS "Users can delete their own bookings" ON public.class_bookings;
CREATE POLICY "Users can delete their own bookings" 
ON public.class_bookings 
FOR DELETE 
USING (
  auth.uid() = user_id 
  AND NOT is_user_blocked(auth.uid())
);

-- Add policy to prevent blocked users from viewing their bookings
DROP POLICY IF EXISTS "Users can view all bookings" ON public.class_bookings;
CREATE POLICY "Users can view own bookings"
ON public.class_bookings
FOR SELECT
USING (
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN true
    ELSE auth.uid() = user_id AND NOT is_user_blocked(auth.uid())
  END
);

-- Update profile policies to prevent blocked users from updating
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = id 
  AND NOT blocked
);

-- Update profile view policy to prevent blocked users from viewing (except their own blocked status)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);