import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function BuySingleClass() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePurchase = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Debes iniciar sesión para comprar");
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "create-single-class-checkout",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

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
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-bebas text-5xl md:text-6xl mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Compra una Clase Individual
          </h1>
          <p className="text-muted-foreground text-lg">
            Accede al gimnasio cuando quieras con tu código QR personal
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <Card className="border-primary/30 hover:border-primary/60 transition-all">
            <CardHeader>
              <CardTitle className="font-bebas text-2xl">¿Qué incluye?</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Una clase individual para usar cuando quieras</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Código QR personal enviado por email</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Acceso completo a todas las instalaciones</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Sin fecha de caducidad</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary-glow/5">
            <CardHeader>
              <CardTitle className="font-bebas text-3xl">Precio</CardTitle>
              <CardDescription>Pago único</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-6xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
                  €15
                </div>
                <p className="text-muted-foreground">Una sola clase</p>
              </div>
              <Button
                onClick={handlePurchase}
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] font-semibold text-lg py-6"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Comprar Ahora
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="font-bebas text-2xl">¿Cómo funciona?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-primary">
                  1
                </div>
                <h3 className="font-semibold mb-2">Compra</h3>
                <p className="text-sm text-muted-foreground">
                  Realiza el pago de forma segura con Stripe
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-primary">
                  2
                </div>
                <h3 className="font-semibold mb-2">Recibe tu QR</h3>
                <p className="text-sm text-muted-foreground">
                  Te enviamos por email tu código QR personal
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-primary">
                  3
                </div>
                <h3 className="font-semibold mb-2">Accede</h3>
                <p className="text-sm text-muted-foreground">
                  Presenta tu QR en la entrada del gimnasio
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
