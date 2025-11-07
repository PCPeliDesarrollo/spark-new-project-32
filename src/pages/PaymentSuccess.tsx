import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Mail, Home } from "lucide-react";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      navigate("/");
    }
  }, [sessionId, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center py-12 px-4">
      <Card className="max-w-2xl w-full border-primary/30">
        <CardHeader className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="font-bebas text-4xl mb-2">
            ¡Pago Completado!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-lg">
              Tu compra se ha procesado correctamente.
            </p>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Mail className="h-5 w-5" />
              <p>Revisa tu correo electrónico</p>
            </div>
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3">¿Qué sigue?</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>
                    Recibirás un email con tu código numérico de acceso en los próximos minutos
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>
                    Guarda el email con el código de 6 dígitos
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                  <span>
                    Presenta el código numérico en la entrada del gimnasio cuando vengas a entrenar
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => navigate("/classes")}
              className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary"
            >
              Ver Clases
            </Button>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="flex-1"
            >
              <Home className="mr-2 h-4 w-4" />
              Ir al Inicio
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Si no recibes el email en 10 minutos, revisa tu carpeta de spam o contacta con nosotros.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
