-- Grant INSERT, UPDATE, DELETE permissions for admins on class_schedules
DROP POLICY IF EXISTS "Admins can insert schedules" ON public.class_schedules;
DROP POLICY IF EXISTS "Admins can update schedules" ON public.class_schedules;
DROP POLICY IF EXISTS "Admins can delete schedules" ON public.class_schedules;

CREATE POLICY "Admins can insert schedules"
ON public.class_schedules
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update schedules"
ON public.class_schedules
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete schedules"
ON public.class_schedules
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));