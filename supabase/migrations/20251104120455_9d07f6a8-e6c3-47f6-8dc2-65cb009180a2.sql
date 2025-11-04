-- Drop the old unique constraint that doesn't include date
ALTER TABLE public.class_bookings
DROP CONSTRAINT IF EXISTS class_bookings_schedule_id_user_id_key;

-- Verify the new constraint exists (it should from the previous migration)
-- If it doesn't exist, we'll create it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_user_schedule_date'
    ) THEN
        ALTER TABLE public.class_bookings
        ADD CONSTRAINT unique_user_schedule_date UNIQUE (user_id, schedule_id, class_date);
    END IF;
END $$;