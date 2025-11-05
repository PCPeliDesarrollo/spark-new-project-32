-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view own bookings" ON class_bookings;

-- Create new policy that allows all authenticated users to view all bookings
CREATE POLICY "Users can view all bookings"
ON class_bookings
FOR SELECT
TO authenticated
USING (NOT is_user_blocked(auth.uid()));

-- Admins can still view everything (keep this for consistency)
CREATE POLICY "Admins can view all bookings"
ON class_bookings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));