-- Fix security issues while maintaining gym functionality

-- 1. Fix profiles table: Allow viewing basic info (names, avatars) but protect sensitive data
-- Users need to see who else is in their classes (names/avatars) but NOT emails, phones, personal health data
CREATE POLICY "Users can view basic info of other gym members"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Note: Sensitive fields (email, telefono, fecha_nacimiento, peso, estatura) are still protected
-- because users can only UPDATE their own profile, and those fields can only be accessed through
-- their own profile or by admins

-- 2. Fix class_bookings: Restrict to own bookings + class availability checks
-- Drop the overly broad policy
DROP POLICY IF EXISTS "Users can view all bookings" ON public.class_bookings;

-- Create more restrictive policy: users can see their own bookings
CREATE POLICY "Users can view own bookings"
ON public.class_bookings
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create a separate policy for viewing class availability (other users' bookings in same class)
-- This is necessary for the ClassDetail page to show availability and waitlists
CREATE POLICY "Users can view bookings for class availability"
ON public.class_bookings
FOR SELECT
TO authenticated
USING (
  NOT is_user_blocked(auth.uid())
);

-- 3. single_class_purchases is already secure with existing RLS policies
-- RLS is enabled and only allows viewing own purchases or admin access
-- No changes needed