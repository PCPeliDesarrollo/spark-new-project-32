-- Permitir que todos los usuarios autenticados puedan ver los nombres básicos de otros usuarios
CREATE POLICY "Users can view basic info of other users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);