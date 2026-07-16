
-- 1. Profiles: drop broad "authenticated can view others" policy
DROP POLICY IF EXISTS "Authenticated users can view other users basic info" ON public.profiles;

-- 2. push_subscriptions: add owner UPDATE policy
CREATE POLICY "Users can update their own push subscriptions"
ON public.push_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. single_class_purchases: deny client inserts (service_role bypasses RLS and remains allowed)
CREATE POLICY "No client inserts on single_class_purchases"
ON public.single_class_purchases
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- 4. Set search_path on functions that lack it
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

-- 5. Storage: drop broad public SELECT policies (buckets remain public, direct URLs still work)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Class images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can view class images" ON storage.objects;

-- 6. SECURITY DEFINER: revoke EXECUTE for internal-only functions from anon and authenticated
REVOKE EXECUTE ON FUNCTION public.reset_monthly_bookings() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.duplicate_schedules_for_next_month() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clean_expired_access_codes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.manage_booking_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_from_waitlist() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_low_class_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
