import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClassCard } from "@/components/ClassCard";
import { Loader2 } from "lucide-react";

interface Class {
  id: string;
  name: string;
  description: string;
  image_url: string;
}

export default function Classes() {
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

  return (
    <div className="container py-8 md:py-12">
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-3 bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">Clases</h1>
        <div className="h-1.5 w-24 bg-gradient-to-r from-primary to-primary-glow rounded-full"></div>
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
