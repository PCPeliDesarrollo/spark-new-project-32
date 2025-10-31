-- Agregar campo para rastrear si el usuario cambió su contraseña
ALTER TABLE public.profiles
ADD COLUMN password_changed boolean NOT NULL DEFAULT false;