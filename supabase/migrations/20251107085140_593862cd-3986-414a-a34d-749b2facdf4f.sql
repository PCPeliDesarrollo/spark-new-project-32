-- Add is_free_training field to classes table
ALTER TABLE public.classes 
ADD COLUMN is_free_training boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.classes.is_free_training IS 'Si es true, los usuarios pueden reservar en cualquier hora sin horarios fijos';

-- Update existing "Entrenamiento Libre" class if it exists
UPDATE public.classes 
SET is_free_training = true 
WHERE name ILIKE '%entrenamiento libre%';