-- First, drop all INSERT policies for class_bookings
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'class_bookings' 
    AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.class_bookings', pol.policyname);
  END LOOP;
END $$;

-- Create new INSERT policy that allows admins to book for others
CREATE POLICY "Allow booking creation" 
ON public.class_bookings 
FOR INSERT 
WITH CHECK (
  CASE
    -- Admins can book for anyone
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN 
      check_booking_limit(user_id) AND (NOT is_user_blocked(user_id))
    -- Regular users can only book for themselves
    ELSE 
      (auth.uid() = user_id) AND 
      check_booking_limit(auth.uid()) AND 
      (NOT is_user_blocked(auth.uid()))
  END
);