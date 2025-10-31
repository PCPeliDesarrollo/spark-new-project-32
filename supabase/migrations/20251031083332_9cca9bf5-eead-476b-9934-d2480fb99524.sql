-- Agregar campo de teléfono a la tabla profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS telefono text;