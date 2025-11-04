-- Tabla para almacenar compras de clases individuales
CREATE TABLE IF NOT EXISTS public.single_class_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  used BOOLEAN DEFAULT false NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  qr_code TEXT NOT NULL,
  UNIQUE(stripe_payment_id)
);

-- Habilitar RLS
ALTER TABLE public.single_class_purchases ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver sus propias compras
CREATE POLICY "Users can view their own purchases"
ON public.single_class_purchases
FOR SELECT
USING (auth.uid() = user_id);

-- Los admins pueden ver todas las compras
CREATE POLICY "Admins can view all purchases"
ON public.single_class_purchases
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Índice para búsquedas por QR
CREATE INDEX idx_single_class_qr ON public.single_class_purchases(qr_code);