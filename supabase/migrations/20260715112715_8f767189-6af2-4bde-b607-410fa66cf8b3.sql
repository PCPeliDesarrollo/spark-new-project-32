
CREATE TABLE public.monthly_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  paid BOOLEAN NOT NULL DEFAULT true,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, year, month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_payments TO authenticated;
GRANT ALL ON public.monthly_payments TO service_role;

ALTER TABLE public.monthly_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all monthly payments"
ON public.monthly_payments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own monthly payments"
ON public.monthly_payments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
