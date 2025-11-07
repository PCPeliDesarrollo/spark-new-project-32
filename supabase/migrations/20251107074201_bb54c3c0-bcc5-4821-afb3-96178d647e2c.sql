-- Crear políticas para el bucket class-images
CREATE POLICY "Admins can upload class images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'class-images' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update class images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'class-images' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete class images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'class-images' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Everyone can view class images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'class-images');