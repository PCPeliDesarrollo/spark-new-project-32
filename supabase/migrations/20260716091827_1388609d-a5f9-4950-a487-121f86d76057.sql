
CREATE TABLE public.training_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  external_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_tables TO authenticated;
GRANT ALL ON public.training_tables TO service_role;

ALTER TABLE public.training_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tables"
  ON public.training_tables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert tables"
  ON public.training_tables FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tables"
  ON public.training_tables FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tables"
  ON public.training_tables FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_training_tables_updated_at
  BEFORE UPDATE ON public.training_tables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for the training-tables bucket (bucket created via tool)
CREATE POLICY "Anyone can view training table files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'training-tables');

CREATE POLICY "Admins can upload training table files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'training-tables' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update training table files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'training-tables' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete training table files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'training-tables' AND public.has_role(auth.uid(), 'admin'));
