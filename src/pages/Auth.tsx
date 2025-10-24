import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import * as z from "zod";

const authSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
});

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in first
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        navigate("/");
        return;
      }
      
      // Only load saved credentials if no active session
      const savedEmail = localStorage.getItem("rememberedEmail");
      const savedPassword = localStorage.getItem("rememberedPassword");
      const wasRemembered = localStorage.getItem("rememberMe") === "true";
      
      if (wasRemembered && savedEmail && savedPassword) {
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/");
      } else if (event === 'SIGNED_OUT') {
        setEmail("");
        setPassword("");
        setRememberMe(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      authSchema.parse({ email, password });

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } else {
        // Save credentials if remember me is checked
        if (rememberMe) {
          localStorage.setItem("rememberedEmail", email);
          localStorage.setItem("rememberedPassword", password);
          localStorage.setItem("rememberMe", "true");
        } else {
          localStorage.removeItem("rememberedEmail");
          localStorage.removeItem("rememberedPassword");
          localStorage.removeItem("rememberMe");
        }
        
        toast({
          title: "¡Éxito!",
          description: "Has iniciado sesión correctamente",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Error de validación",
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Ocurrió un error inesperado",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[url('/pantera-logo.png')] bg-contain bg-center bg-no-repeat opacity-[0.03] scale-150" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-glow/20 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <Card className="w-full max-w-md relative z-10 backdrop-blur-sm bg-card/95 border-primary/20 shadow-[0_0_40px_rgba(59,130,246,0.3)] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pantera-logo.png')] bg-contain bg-center bg-no-repeat opacity-[0.05] pointer-events-none" />
        <CardHeader className="space-y-1 text-center relative z-10 px-4">
          <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bebas tracking-wider bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent leading-tight">
            PANTHERA FITNESS ALBURQUERQUE
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 px-4 md:px-6">
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="border-primary/30 focus:border-primary text-sm md:text-base"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium">Contraseña</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="border-primary/30 focus:border-primary text-sm md:text-base"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 md:h-4 md:w-4 rounded border-primary/30 text-primary focus:ring-primary flex-shrink-0"
              />
              <label htmlFor="rememberMe" className="text-xs md:text-sm font-medium cursor-pointer">
                Recordar mis datos
              </label>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300 text-sm md:text-base"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs md:text-sm text-muted-foreground px-2">
            <p>Si necesitas una cuenta, contacta con el administrador</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}