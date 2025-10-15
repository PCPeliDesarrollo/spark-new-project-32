-- Add avatar_url to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- Create classes table
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Classes are viewable by everyone" ON public.classes;
CREATE POLICY "Classes are viewable by everyone"
ON public.classes FOR SELECT
USING (true);

-- Create class_schedules table
CREATE TABLE IF NOT EXISTS public.class_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 20,
  week_start_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Class schedules are viewable by everyone" ON public.class_schedules;
CREATE POLICY "Class schedules are viewable by everyone"
ON public.class_schedules FOR SELECT
USING (true);

-- Create class_bookings table
CREATE TABLE IF NOT EXISTS public.class_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, user_id)
);

ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all bookings" ON public.class_bookings;
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.class_bookings;
DROP POLICY IF EXISTS "Users can delete their own bookings" ON public.class_bookings;

CREATE POLICY "Users can view all bookings"
ON public.class_bookings FOR SELECT
USING (true);

CREATE POLICY "Users can create their own bookings"
ON public.class_bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookings"
ON public.class_bookings FOR DELETE
USING (auth.uid() = user_id);

-- Create triggers
DROP TRIGGER IF EXISTS update_classes_updated_at ON public.classes;
CREATE TRIGGER update_classes_updated_at
BEFORE UPDATE ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_class_schedules_updated_at ON public.class_schedules;
CREATE TRIGGER update_class_schedules_updated_at
BEFORE UPDATE ON public.class_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample classes
INSERT INTO public.classes (name, description, image_url) 
SELECT * FROM (VALUES
  ('Spinning', 'Clase de ciclismo indoor de alta intensidad', 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=500'),
  ('Yoga', 'Práctica de yoga para todos los niveles', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500'),
  ('Pilates', 'Fortalecimiento del core y flexibilidad', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=500'),
  ('Zumba', 'Baile fitness con ritmos latinos', 'https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=500'),
  ('CrossFit', 'Entrenamiento funcional de alta intensidad', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500'),
  ('Boxing', 'Entrenamiento de boxeo y cardio', 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=500')
) AS v(name, description, image_url)
WHERE NOT EXISTS (SELECT 1 FROM public.classes LIMIT 1);

-- Insert sample schedules for current week
INSERT INTO public.class_schedules (class_id, day_of_week, start_time, duration_minutes, max_capacity, week_start_date)
SELECT 
  c.id,
  (ARRAY[1, 3, 5])[s.day_idx] as day_of_week,
  (ARRAY['09:00', '18:00'])[t.time_idx]::TIME as start_time,
  60 as duration_minutes,
  20 as max_capacity,
  date_trunc('week', CURRENT_DATE)::DATE as week_start_date
FROM public.classes c
CROSS JOIN (
  SELECT generate_series(1, 3) as day_idx
) s
CROSS JOIN (
  SELECT generate_series(1, 2) as time_idx
) t
WHERE NOT EXISTS (SELECT 1 FROM public.class_schedules LIMIT 1);