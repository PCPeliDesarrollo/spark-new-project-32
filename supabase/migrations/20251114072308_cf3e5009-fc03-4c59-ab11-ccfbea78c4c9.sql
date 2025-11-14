-- Add RLS policy to profiles table to allow authenticated users to view other users
-- The profiles_public VIEW will filter which columns are exposed
CREATE POLICY "Authenticated users can view other users basic info"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);