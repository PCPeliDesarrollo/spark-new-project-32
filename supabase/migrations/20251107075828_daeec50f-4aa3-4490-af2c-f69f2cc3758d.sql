-- Crear tabla para códigos de acceso temporales
CREATE TABLE public.access_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para búsquedas rápidas por código
CREATE INDEX idx_access_codes_code ON public.access_codes(code);

-- Índice para búsquedas por usuario
CREATE INDEX idx_access_codes_user_id ON public.access_codes(user_id);

-- Enable RLS
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own codes
CREATE POLICY "Users can view their own access codes"
ON public.access_codes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own codes
CREATE POLICY "Users can insert their own access codes"
ON public.access_codes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Función para limpiar códigos expirados (se puede ejecutar periódicamente)
CREATE OR REPLACE FUNCTION public.clean_expired_access_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.access_codes
  WHERE expires_at < now() OR used = true;
END;
$$;