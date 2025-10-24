-- Allow admins to insert, update, and delete classes
CREATE POLICY "Admins can insert classes"
ON public.classes
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update classes"
ON public.classes
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete classes"
ON public.classes
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));