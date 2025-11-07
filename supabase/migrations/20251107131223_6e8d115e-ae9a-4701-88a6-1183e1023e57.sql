-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view basic info of other gym members" ON public.profiles;

-- Create a view with only non-sensitive profile information
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  full_name,
  apellidos,
  avatar_url,
  created_at,
  blocked
FROM public.profiles;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;

-- Enable RLS on the view (views inherit RLS from base tables, but we can add extra policies)
ALTER VIEW public.profiles_public SET (security_invoker = on);