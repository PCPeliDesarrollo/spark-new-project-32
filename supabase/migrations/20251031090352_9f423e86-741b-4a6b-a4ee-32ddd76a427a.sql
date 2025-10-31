-- Drop the existing INSERT policy for class_bookings
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.class_bookings;

-- Create new INSERT policy that allows admins to book for others
CREATE POLICY "Users can create bookings" 
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