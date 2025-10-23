-- Create access_logs table for door entry tracking
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_type TEXT NOT NULL DEFAULT 'door_entry',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for access_logs
CREATE POLICY "Users can view their own access logs"
  ON public.access_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all access logs
CREATE POLICY "Admins can view all access logs"
  ON public.access_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON public.access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON public.access_logs(timestamp DESC);