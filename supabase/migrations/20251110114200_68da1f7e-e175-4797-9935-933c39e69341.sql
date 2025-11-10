-- Permitir a usuarios con roles que pueden reservar clases crear schedules temporales para entrenamientos libres
-- (solo schedules con max_capacity=1, que son los temporales para entrenamientos libres)

CREATE POLICY "Users can create temporary schedules for free training"
ON public.class_schedules
FOR INSERT
TO authenticated
WITH CHECK (
  max_capacity = 1 
  AND (
    has_role(auth.uid(), 'basica_clases'::app_role) 
    OR has_role(auth.uid(), 'full'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);