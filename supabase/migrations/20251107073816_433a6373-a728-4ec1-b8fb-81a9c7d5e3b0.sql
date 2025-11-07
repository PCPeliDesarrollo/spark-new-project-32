-- Habilitar replicación completa para actualizaciones en tiempo real
ALTER TABLE public.classes REPLICA IDENTITY FULL;

-- Agregar la tabla a la publicación de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;