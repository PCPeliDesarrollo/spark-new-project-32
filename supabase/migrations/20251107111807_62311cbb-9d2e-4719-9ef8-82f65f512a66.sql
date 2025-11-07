-- Drop the overly permissive policy that allows anyone to view all user data
DROP POLICY IF EXISTS "Users can view basic info of other users" ON public.profiles;

-- The existing policies already handle:
-- 1. Users can view their own profile (auth.uid() = id)
-- 2. Admins can view all profiles (has_role(auth.uid(), 'admin'))
-- 
-- This ensures that:
-- - Users can only see their own personal information
-- - Admins can see all users' information
-- - No public access to sensitive personal data