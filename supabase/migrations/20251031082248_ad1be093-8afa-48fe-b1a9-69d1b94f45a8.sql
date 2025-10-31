-- Crear tabla para gestionar renovaciones de suscripción
CREATE TABLE IF NOT EXISTS public.subscription_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  next_payment_date date NOT NULL,
  last_payment_date date,
  notified_at_3_days boolean DEFAULT false,
  notified_at_5_days boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_renewals ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para subscription_renewals
CREATE POLICY "Users can view their own renewals"
ON public.subscription_renewals
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all renewals"
ON public.subscription_renewals
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert renewals"
ON public.subscription_renewals
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update renewals"
ON public.subscription_renewals
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete renewals"
ON public.subscription_renewals
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_subscription_renewals_updated_at
BEFORE UPDATE ON public.subscription_renewals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función para notificar cuando quedan 3 clases
CREATE OR REPLACE FUNCTION notify_low_class_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  current_month_start date;
  booking_count integer;
  user_full_name text;
  remaining_classes integer;
BEGIN
  -- Solo procesar bookings confirmados
  IF NEW.status != 'confirmed' THEN
    RETURN NEW;
  END IF;

  -- Obtener el rol del usuario
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = NEW.user_id
  LIMIT 1;

  -- Solo aplicar a usuarios con límite de clases
  IF user_role = 'basica_clases' OR user_role = 'full' THEN
    current_month_start := date_trunc('month', CURRENT_DATE);
    
    -- Contar las reservas confirmadas del mes
    SELECT COUNT(*) INTO booking_count
    FROM class_bookings
    WHERE user_id = NEW.user_id
      AND created_at >= current_month_start
      AND status = 'confirmed';
    
    remaining_classes := 12 - booking_count;
    
    -- Si quedan exactamente 3 clases, notificar al usuario
    IF remaining_classes = 3 THEN
      SELECT full_name INTO user_full_name
      FROM profiles
      WHERE id = NEW.user_id;
      
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (
        NEW.user_id,
        '¡Atención! Quedan 3 clases',
        'Solo te quedan 3 clases hasta la próxima renovación mensual. Planifica bien tus entrenamientos.',
        'warning'
      );
      
      -- Notificar a todos los admins
      INSERT INTO notifications (user_id, title, message, type)
      SELECT ur.user_id, 
        'Usuario con 3 clases restantes',
        user_full_name || ' solo tiene 3 clases disponibles este mes.',
        'info'
      FROM user_roles ur
      WHERE ur.role = 'admin';
    END IF;
    
    -- Si no quedan clases (llegó al límite), notificar
    IF remaining_classes = 0 THEN
      SELECT full_name INTO user_full_name
      FROM profiles
      WHERE id = NEW.user_id;
      
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (
        NEW.user_id,
        'Límite de clases alcanzado',
        'Has alcanzado tu límite de 12 clases este mes. Para seguir reservando, espera a la próxima renovación.',
        'warning'
      );
      
      -- Notificar a todos los admins
      INSERT INTO notifications (user_id, title, message, type)
      SELECT ur.user_id,
        'Usuario sin clases disponibles',
        user_full_name || ' ha alcanzado su límite de 12 clases este mes.',
        'warning'
      FROM user_roles ur
      WHERE ur.role = 'admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger para notificaciones de clases bajas
CREATE TRIGGER notify_on_class_booking
AFTER INSERT ON public.class_bookings
FOR EACH ROW
EXECUTE FUNCTION notify_low_class_count();