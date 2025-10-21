-- Add status and position columns to class_bookings for waitlist functionality
ALTER TABLE public.class_bookings 
ADD COLUMN status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlist')),
ADD COLUMN position integer;

-- Create index for better query performance
CREATE INDEX idx_class_bookings_schedule_status ON public.class_bookings(schedule_id, status, position);

-- Create function to manage waitlist positions
CREATE OR REPLACE FUNCTION public.manage_booking_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_confirmed_count integer;
  schedule_capacity integer;
  next_position integer;
BEGIN
  -- Get the schedule's max capacity
  SELECT max_capacity INTO schedule_capacity
  FROM class_schedules
  WHERE id = NEW.schedule_id;

  -- Count current confirmed bookings
  SELECT COUNT(*) INTO current_confirmed_count
  FROM class_bookings
  WHERE schedule_id = NEW.schedule_id 
    AND status = 'confirmed'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- If inserting a new booking
  IF TG_OP = 'INSERT' THEN
    IF current_confirmed_count < schedule_capacity THEN
      -- There's space, confirm the booking
      NEW.status := 'confirmed';
      NEW.position := NULL;
    ELSE
      -- Class is full, add to waitlist
      SELECT COALESCE(MAX(position), 0) + 1 INTO next_position
      FROM class_bookings
      WHERE schedule_id = NEW.schedule_id AND status = 'waitlist';
      
      NEW.status := 'waitlist';
      NEW.position := next_position;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for new bookings
CREATE TRIGGER before_insert_booking
BEFORE INSERT ON public.class_bookings
FOR EACH ROW
EXECUTE FUNCTION public.manage_booking_status();

-- Create function to promote waitlist when someone cancels
CREATE OR REPLACE FUNCTION public.promote_from_waitlist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_waitlist_id uuid;
  schedule_capacity integer;
  current_confirmed_count integer;
BEGIN
  -- Only process if a confirmed booking was deleted
  IF OLD.status = 'confirmed' THEN
    -- Get schedule capacity
    SELECT max_capacity INTO schedule_capacity
    FROM class_schedules
    WHERE id = OLD.schedule_id;

    -- Count current confirmed bookings
    SELECT COUNT(*) INTO current_confirmed_count
    FROM class_bookings
    WHERE schedule_id = OLD.schedule_id AND status = 'confirmed';

    -- If there's now space and there are people on waitlist
    IF current_confirmed_count < schedule_capacity THEN
      -- Get the first person on waitlist
      SELECT id INTO next_waitlist_id
      FROM class_bookings
      WHERE schedule_id = OLD.schedule_id 
        AND status = 'waitlist'
      ORDER BY position ASC
      LIMIT 1;

      -- Promote them to confirmed
      IF next_waitlist_id IS NOT NULL THEN
        UPDATE class_bookings
        SET status = 'confirmed', position = NULL
        WHERE id = next_waitlist_id;

        -- Reorder remaining waitlist
        UPDATE class_bookings
        SET position = position - 1
        WHERE schedule_id = OLD.schedule_id 
          AND status = 'waitlist'
          AND position > (SELECT position FROM class_bookings WHERE id = next_waitlist_id);
      END IF;
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

-- Create trigger for deletions
CREATE TRIGGER after_delete_booking
AFTER DELETE ON public.class_bookings
FOR EACH ROW
EXECUTE FUNCTION public.promote_from_waitlist();