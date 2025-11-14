import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function BuySingleClass() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Por favor ingresa un email válido");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke("create-single-class-checkout", {
        body: { email },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al procesar el pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img 
            src="/pantera-logo.png" 
            alt="Pantera Fitness" 
            className="h-12 cursor-pointer"
            onClick={() => navigate("/")}
          />
          <Button variant="outline" onClick={() => navigate("/auth")}>
            Iniciar Sesión
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            Compra tu Entrada Diaria
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Accede al gimnasio por un día completo sin compromiso.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Purchase Form */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Comprar Entrada</CardTitle>
              <CardDescription>
                Ingresa tu email para recibir el código numérico de acceso al gimnasio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePurchase} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-semibold">Precio:</span>
                    <span className="text-3xl font-bold text-primary">€5.00</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pago único • Acceso por un día
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={loading}
                >
                  {loading ? "Procesando..." : "Comprar Ahora"}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Al hacer clic en "Comprar Ahora", serás redirigido a Stripe para completar el pago de forma segura.
                </p>
              </form>
            </CardContent>
          </Card>

          {/* What's Included */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">¿Qué Incluye?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Acceso Completo por un Día</h3>
                  <p className="text-sm text-muted-foreground">
                    Accede a todas las instalaciones del gimnasio
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Código Numérico por Email</h3>
                  <p className="text-sm text-muted-foreground">
                    Recibirás tu código de 6 dígitos inmediatamente después del pago
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Sin Compromiso</h3>
                  <p className="text-sm text-muted-foreground">
                    Pago único, sin mensualidades ni contratos
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Válido por 30 Días</h3>
                  <p className="text-sm text-muted-foreground">
                    Usa tu código dentro de los próximos 30 días
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How it Works */}
        <div className="max-w-4xl mx-auto mt-16">
          <h2 className="text-3xl font-bold text-center mb-8">¿Cómo Funciona?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="font-semibold text-lg">Ingresa tu Email</h3>
              <p className="text-sm text-muted-foreground">
                Completa el formulario con tu dirección de correo electrónico
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="font-semibold text-lg">Completa el Pago</h3>
              <p className="text-sm text-muted-foreground">
                Paga de forma segura a través de Stripe
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="font-semibold text-lg">Accede al Gimnasio</h3>
              <p className="text-sm text-muted-foreground">
                Presenta tu código de 6 dígitos en recepción y disfruta tu día
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
