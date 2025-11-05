-- Permitir que los admins puedan eliminar cualquier reserva
CREATE POLICY "Admins can delete any booking"
ON public.class_bookings
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));