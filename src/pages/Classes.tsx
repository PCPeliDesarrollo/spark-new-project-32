import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ClassCard } from "@/components/ClassCard";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { MonthlyClassesIndicator } from "@/components/MonthlyClassesIndicator";

interface ClassData {
  id: string;
  name: string;
  description: string;
  image_url: string;
}

export default function Classes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    // Suscribirse a cambios en tiempo real en la tabla classes
    const channel = supabase
      .channel('classes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes'
        },
        (payload) => {
          console.log('Cambio detectado en classes:', payload);
          loadData(); // Recargar las clases cuando haya cambios
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      // Get current week's Monday for filtering
      const now = new Date();
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
      currentWeekStart.setHours(0, 0, 0, 0);

      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("*")
        .order("name");

      if (classesError) throw classesError;

      setClasses(classesData || []);
    } catch (error) {
      console.error("Error loading classes:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las clases",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-4 md:py-8 px-4">
      <h1 className="font-bebas text-4xl md:text-6xl tracking-wider mb-6 md:mb-8 text-primary drop-shadow-[0_0_25px_hsl(var(--primary)/0.6)] text-center">
        CLASES DISPONIBLES
      </h1>

      <MonthlyClassesIndicator />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((classItem) => (
          <ClassCard
            key={classItem.id}
            id={classItem.id}
            name={classItem.name}
            description={classItem.description}
            imageUrl={classItem.image_url}
          />
        ))}
      </div>
    </div>
  );
}
