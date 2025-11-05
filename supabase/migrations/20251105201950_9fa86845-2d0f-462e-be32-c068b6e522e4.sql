-- Agregar columna para código numérico de acceso
ALTER TABLE public.single_class_purchases
ADD COLUMN access_code TEXT;

-- Crear índice único para códigos de acceso
CREATE UNIQUE INDEX idx_unique_access_code ON public.single_class_purchases(access_code) WHERE used = false;