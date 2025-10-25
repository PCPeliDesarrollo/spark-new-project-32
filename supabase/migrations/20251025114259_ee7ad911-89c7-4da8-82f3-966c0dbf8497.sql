-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- Update promote_from_waitlist function to create notifications
CREATE OR REPLACE FUNCTION public.promote_from_waitlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  next_waitlist_id uuid;
  next_waitlist_user_id uuid;
  schedule_capacity integer;
  current_confirmed_count integer;
  class_name text;
  class_date date;
  class_time time;
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
      -- Get the first person on waitlist and their user_id
      SELECT cb.id, cb.user_id INTO next_waitlist_id, next_waitlist_user_id
      FROM class_bookings cb
      WHERE cb.schedule_id = OLD.schedule_id 
        AND cb.status = 'waitlist'
      ORDER BY cb.position ASC
      LIMIT 1;

      -- Promote them to confirmed
      IF next_waitlist_id IS NOT NULL THEN
        UPDATE class_bookings
        SET status = 'confirmed', position = NULL
        WHERE id = next_waitlist_id;

        -- Get class details for notification
        SELECT c.name, cs.week_start_date, cs.start_time
        INTO class_name, class_date, class_time
        FROM class_schedules cs
        JOIN classes c ON c.id = cs.class_id
        WHERE cs.id = OLD.schedule_id;

        -- Create notification for promoted user
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
          next_waitlist_user_id,
          '¡Plaza confirmada!',
          'Has conseguido plaza en la clase de ' || class_name || ' del ' || 
          to_char(class_date, 'DD/MM/YYYY') || ' a las ' || 
          to_char(class_time, 'HH24:MI') || '. ¡Te esperamos!',
          'success'
        );

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
$function$;

-- Update manage_booking_status to create notification when user is waitlisted
CREATE OR REPLACE FUNCTION public.manage_booking_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_confirmed_count integer;
  schedule_capacity integer;
  next_position integer;
  class_name text;
  class_date date;
  class_time time;
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

      -- Get class details for notification
      SELECT c.name, cs.week_start_date, cs.start_time
      INTO class_name, class_date, class_time
      FROM class_schedules cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.id = NEW.schedule_id;

      -- Create notification for waitlisted user
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        NEW.user_id,
        'En lista de reserva',
        'Has quedado en lista de reserva para la clase de ' || class_name || ' del ' || 
        to_char(class_date, 'DD/MM/YYYY') || ' a las ' || 
        to_char(class_time, 'HH24:MI') || '. Te avisaremos si hay plazas disponibles.',
        'warning'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;