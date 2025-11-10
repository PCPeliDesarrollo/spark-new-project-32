import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import panteraLogo from "@/assets/pantera.png";
import { MonthlyClassesIndicator } from "@/components/MonthlyClassesIndicator";

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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Fondo con logo de pantera */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0">
        <img 
          src={panteraLogo} 
          alt="" 
          className="w-[1000px] h-[1000px] object-contain"
        />
      </div>

      {/* Header */}
      <header className="border-b border-primary/20 bg-card/30 backdrop-blur-md sticky top-0 z-50 shadow-lg shadow-primary/5">
        <div className="container mx-auto px-3 md:px-4 py-3 md:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <div className="relative p-2 md:p-2.5 bg-gradient-to-br from-primary/20 to-primary-glow/20 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:scale-105 flex-shrink-0">
              <img src={panteraLogo} alt="Panthera Fitness" className="w-5 h-5 md:w-7 md:h-7 object-contain" />
            </div>
            <span className="font-bebas text-sm md:text-xl tracking-wider bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(59,130,246,0.5)] truncate">
              <span className="hidden sm:inline">PANTHERA FITNESS ALBURQUERQUE</span>
              <span className="sm:hidden">PANTHERA</span>
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="border-primary/30 bg-card/50 backdrop-blur-sm hover:bg-destructive/20 hover:text-destructive hover:border-destructive/50 text-xs md:text-sm transition-all duration-300 hover:scale-105 flex-shrink-0"
          >
            <LogOut className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Cerrar Sesión</span>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-primary-glow/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        
        <div className="container mx-auto px-4 py-16 md:py-24 text-center relative z-10">
          <div className="inline-block mb-6 md:mb-8 p-3 md:p-4 bg-gradient-to-br from-primary/20 to-primary-glow/20 rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.3)] backdrop-blur-sm border border-primary/20">
            <img src={panteraLogo} alt="Panthera Fitness" className="w-16 h-16 md:w-24 md:h-24 object-contain" />
          </div>
          <h1 className="font-bebas text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-wider mb-4 md:mb-6 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent animate-fade-in leading-tight drop-shadow-[0_4px_20px_rgba(59,130,246,0.8)] [text-shadow:_0_0_40px_rgba(59,130,246,0.6)]">
            BIENVENIDO A PANTHERA FITNESS ALBURQUERQUE
          </h1>
          <p className="text-xl md:text-3xl font-bold text-foreground/90 mb-6 md:mb-8 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)] [text-shadow:_0_2px_20px_rgba(59,130,246,0.5)]">
            🔥 TRANSFORMA TU CUERPO, SUPERA TUS LÍMITES 🔥
          </p>
          <p className="text-lg md:text-2xl text-foreground/80 mb-8 md:mb-10 max-w-3xl mx-auto px-4 leading-relaxed">
            <span className="text-primary font-semibold">Gestiona tus clases y alcanza tus objetivos de fitness.</span>
          </p>
          
          {/* CTA Comprar Clase */}
          <div className="mb-8">
            <Button 
              size="lg"
              onClick={() => navigate("/buy-single-class")}
              className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-primary-foreground font-bold text-base md:text-lg px-8 py-6 rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] transition-all duration-300 hover:scale-105"
            >
              💳 Comprar Clase Individual - €4.50
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              ¿Primera vez? Prueba una clase sin compromiso
            </p>
          </div>

          {user && (
            <div className="inline-block px-6 py-3 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/30 shadow-lg shadow-primary/20">
              <p className="text-base md:text-xl text-primary font-bold">
                ¡Hola, {user.email}!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <MonthlyClassesIndicator />
        
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 mt-6">
          <Card className="group relative bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 hover:border-primary/60 transition-all duration-500 hover:scale-105 hover:shadow-[0_0_40px_rgba(59,130,246,0.2)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-6 md:p-8 text-center relative z-10">
              <div className="inline-block p-4 md:p-5 bg-gradient-to-br from-primary/20 to-primary-glow/10 rounded-2xl mb-4 md:mb-5 shadow-lg group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-500 group-hover:scale-110">
                <Calendar className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              </div>
              <h3 className="font-bebas text-2xl md:text-3xl tracking-wide mb-3 text-foreground">CLASES PROGRAMADAS</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Próximamente podrás ver y reservar todas las clases disponibles
              </p>
            </CardContent>
          </Card>

          <Card className="group relative bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 hover:border-primary/60 transition-all duration-500 hover:scale-105 hover:shadow-[0_0_40px_rgba(59,130,246,0.2)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-6 md:p-8 text-center relative z-10">
              <div className="inline-block p-4 md:p-5 bg-gradient-to-br from-primary/20 to-primary-glow/10 rounded-2xl mb-4 md:mb-5 shadow-lg group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-500 group-hover:scale-110">
                <img src={panteraLogo} alt="Entrena" className="w-8 h-8 md:w-10 md:h-10" />
              </div>
              <h3 className="font-bebas text-2xl md:text-3xl tracking-wide mb-3 text-foreground">ENTRENA CON NOSOTROS</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Accede a entrenamientos personalizados y seguimiento de progreso
              </p>
            </CardContent>
          </Card>

          <Card className="group relative bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 hover:border-primary/60 transition-all duration-500 hover:scale-105 hover:shadow-[0_0_40px_rgba(59,130,246,0.2)] overflow-hidden sm:col-span-2 md:col-span-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardContent className="p-6 md:p-8 text-center relative z-10">
              <div className="inline-block p-4 md:p-5 bg-gradient-to-br from-primary/20 to-primary-glow/10 rounded-2xl mb-4 md:mb-5 shadow-lg group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-500 group-hover:scale-110">
                <Users className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              </div>
              <h3 className="font-bebas text-2xl md:text-3xl tracking-wide mb-3 text-foreground">COMUNIDAD</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Conecta con otros miembros y comparte tu progreso
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <Card className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-primary-glow/10 to-card/50 border-primary/40 backdrop-blur-md shadow-[0_0_60px_rgba(59,130,246,0.2)]">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary-glow/5"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px]"></div>
          <CardContent className="p-8 md:p-12 lg:p-16 text-center relative z-10">
            <h2 className="font-bebas text-4xl md:text-5xl lg:text-6xl tracking-wider mb-4 md:mb-6 bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">
              ¿LISTO PARA COMENZAR?
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-foreground/70 mb-6 md:mb-8 max-w-3xl mx-auto px-2 leading-relaxed">
              Estamos construyendo las mejores funcionalidades para tu experiencia fitness. 
              Pronto podrás reservar clases, seguir tu progreso y mucho más.
            </p>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-primary-foreground font-bold text-base md:text-lg px-8 py-6 rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] transition-all duration-300 hover:scale-105"
            >
              Explorar Clases (Próximamente)
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Index;