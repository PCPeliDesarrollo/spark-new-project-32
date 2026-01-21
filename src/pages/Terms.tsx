import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bebas tracking-wide text-primary">
              Términos y Condiciones de Uso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[70vh] pr-4">
              <div className="space-y-6 text-sm text-muted-foreground">
                <p className="text-foreground font-medium">
                  Última actualización: Enero 2025
                </p>

                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    1. Aceptación de los Términos
                  </h2>
                  <p>
                    Al acceder y utilizar la aplicación Panthera Fitness Alburquerque ("la App"), 
                    aceptas estar sujeto a estos Términos y Condiciones de Uso. Si no estás de 
                    acuerdo con alguna parte de estos términos, no debes utilizar la App.
                  </p>
                </section>

                <section className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                  <h2 className="text-lg font-semibold text-destructive mb-2">
                    ⚠️ 2. Aviso de Salud Importante
                  </h2>
                  <p className="text-foreground font-medium mb-2">
                    ESTA APLICACIÓN NO PROPORCIONA ASESORAMIENTO MÉDICO.
                  </p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>
                      La información proporcionada por esta aplicación es únicamente para fines 
                      informativos y de entretenimiento general.
                    </li>
                    <li>
                      No sustituye el consejo, diagnóstico o tratamiento médico profesional.
                    </li>
                    <li>
                      Siempre consulta a un médico u otro profesional de la salud calificado 
                      antes de comenzar cualquier programa de ejercicios o dieta.
                    </li>
                    <li>
                      Si experimentas dolor, mareos, dificultad para respirar u otros síntomas 
                      durante el ejercicio, detente inmediatamente y busca atención médica.
                    </li>
                    <li>
                      Nunca ignores el consejo médico profesional ni retrases su búsqueda debido 
                      a algo que hayas leído en esta aplicación.
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    3. Asunción de Riesgos
                  </h2>
                  <p>
                    El ejercicio físico conlleva riesgos inherentes. Al utilizar esta App y 
                    participar en actividades físicas en Panthera Fitness Alburquerque, reconoces 
                    y aceptas que:
                  </p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Participas voluntariamente en actividades físicas bajo tu propio riesgo.</li>
                    <li>Eres responsable de evaluar tu propia condición física antes de realizar ejercicios.</li>
                    <li>Panthera Fitness no es responsable de lesiones resultantes del uso inadecuado del equipo o de la participación en actividades más allá de tus capacidades físicas.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    4. Uso de la Aplicación
                  </h2>
                  <p>
                    La App te permite:
                  </p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Reservar clases en Panthera Fitness Alburquerque</li>
                    <li>Gestionar tu perfil de usuario</li>
                    <li>Ver información sobre el gimnasio y sus servicios</li>
                    <li>Realizar cálculos relacionados con fitness (IMC, calorías, etc.)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    5. Cuenta de Usuario
                  </h2>
                  <p>
                    Para acceder a la App, necesitas una cuenta proporcionada por el administrador. 
                    Eres responsable de mantener la confidencialidad de tus credenciales y de todas 
                    las actividades que ocurran bajo tu cuenta.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    6. Política de Cancelación
                  </h2>
                  <p>
                    Las reservas de clases pueden cancelarse hasta 2 horas antes del inicio de la 
                    clase. Las cancelaciones tardías o la no asistencia pueden afectar tu acceso 
                    a futuras reservas.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    7. Limitación de Responsabilidad
                  </h2>
                  <p>
                    Panthera Fitness Alburquerque y sus desarrolladores no serán responsables de 
                    ningún daño directo, indirecto, incidental, especial o consecuente que resulte 
                    del uso o la imposibilidad de usar la App o de cualquier actividad física 
                    realizada en relación con la información proporcionada.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    8. Modificaciones
                  </h2>
                  <p>
                    Nos reservamos el derecho de modificar estos términos en cualquier momento. 
                    Los cambios entrarán en vigor inmediatamente después de su publicación en la App.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    9. Contacto
                  </h2>
                  <p>
                    Para cualquier pregunta sobre estos términos, contacta con nosotros:
                  </p>
                  <ul className="list-none space-y-1 mt-2">
                    <li><strong>Teléfono:</strong> 623 61 69 50</li>
                    <li><strong>Instagram:</strong> @pantherafitnessalburquerque</li>
                  </ul>
                </section>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
