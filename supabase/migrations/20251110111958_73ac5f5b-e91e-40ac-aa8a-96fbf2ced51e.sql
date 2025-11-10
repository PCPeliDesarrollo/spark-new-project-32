-- Add morning_reminder_sent column to class_bookings
ALTER TABLE public.class_bookings 
ADD COLUMN IF NOT EXISTS morning_reminder_sent BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_class_bookings_morning_reminder 
ON public.class_bookings (morning_reminder_sent, class_date) 
WHERE status = 'confirmed';