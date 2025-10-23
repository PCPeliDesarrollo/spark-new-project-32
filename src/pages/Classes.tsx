import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClassCard } from "@/components/ClassCard";
import { Loader2, Lock } from "lucide-react";
import { useBlockedStatus } from "@/hooks/useBlockedStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Class {
  id: string;
  name: string;
  description: string;
  image_url: string;
}

export default function Classes() {
  const { isBlocked } = useBlockedStatus();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("name");

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error("Error loading classes:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="container py-8 md:py-12 px-4">
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <Lock className="h-4 w-4" />
          <AlertTitle>Cuenta bloqueada</AlertTitle>
          <AlertDescription>
            Tu cuenta ha sido bloqueada por el administrador. No puedes acceder a las clases. 
            Por favor, contacta con el gimnasio para más información.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 px-4">
      <div className="mb-12 text-center md:text-left">
        <h1 className="font-bebas text-5xl sm:text-6xl md:text-8xl tracking-wider mb-4 bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent drop-shadow-[0_4px_20px_rgba(59,130,246,0.8)] [text-shadow:_0_0_40px_rgba(59,130,246,0.6)]">
          CLASES
        </h1>
        <div className="h-1 w-32 bg-gradient-to-r from-primary to-primary-glow rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)] mx-auto md:mx-0"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {classes.map((cls) => (
          <ClassCard
            key={cls.id}
            id={cls.id}
            name={cls.name}
            description={cls.description}
            imageUrl={cls.image_url}
          />
        ))}
      </div>
    </div>
  );
}
