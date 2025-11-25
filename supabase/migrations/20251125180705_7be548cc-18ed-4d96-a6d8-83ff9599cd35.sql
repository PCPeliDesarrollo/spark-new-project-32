-- Add permanent access_code column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN access_code TEXT UNIQUE;

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.access_code IS 'Permanent 6-digit numeric access code assigned by admin';

-- Add check constraint to ensure it's 6 digits if provided
ALTER TABLE public.profiles 
ADD CONSTRAINT access_code_format CHECK (access_code IS NULL OR (access_code ~ '^\d{6}$'));

-- Drop the temporary access_codes table as it's no longer needed
DROP TABLE IF EXISTS public.access_codes CASCADE;