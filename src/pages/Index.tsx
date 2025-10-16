import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import panteraLogo from "@/assets/pantera.png";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user && loading) {
          navigate("/auth");
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, loading]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "No se pudo cerrar sesión",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
      navigate("/auth");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg">
              <img src={panteraLogo} alt="Panthera Fitness" className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-base md:text-xl font-bold">Panthera Fitness</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive text-xs md:text-sm"
          >
            <LogOut className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
            <span className="sm:hidden">Salir</span>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="container mx-auto px-4 py-12 md:py-20 text-center relative z-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
            Bienvenido a Panthera Fitness
          </h1>
          <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto px-4">
            Transforma tu cuerpo, supera tus límites. Gestiona tus clases y alcanza tus objetivos de fitness.
          </p>
          {user && (
            <p className="text-sm md:text-lg text-primary font-semibold mb-6 md:mb-8">
              ¡Hola, {user.email}!
            </p>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-10 md:py-16">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          <Card className="bg-card/80 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all hover:scale-105">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="inline-block p-3 md:p-4 bg-primary/10 rounded-full mb-3 md:mb-4">
                <Calendar className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2">Clases Programadas</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                Próximamente podrás ver y reservar todas las clases disponibles
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all hover:scale-105">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="inline-block p-3 md:p-4 bg-primary/10 rounded-full mb-3 md:mb-4">
                <img src={panteraLogo} alt="Entrena" className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2">Entrena con Nosotros</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                Accede a entrenamientos personalizados y seguimiento de progreso
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all hover:scale-105 sm:col-span-2 md:col-span-1">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="inline-block p-3 md:p-4 bg-primary/10 rounded-full mb-3 md:mb-4">
                <Users className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2">Comunidad</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                Conecta con otros miembros y comparte tu progreso
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-10 md:py-16">
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/30">
          <CardContent className="p-6 md:p-8 lg:p-12 text-center">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
              ¿Listo para comenzar?
            </h2>
            <p className="text-sm md:text-base lg:text-lg text-muted-foreground mb-4 md:mb-6 max-w-2xl mx-auto px-2">
              Estamos construyendo las mejores funcionalidades para tu experiencia fitness. 
              Pronto podrás reservar clases, seguir tu progreso y mucho más.
            </p>
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm md:text-base">
              Explorar Clases (Próximamente)
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Index;