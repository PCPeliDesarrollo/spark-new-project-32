import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Privacy() {
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
              Política de Privacidad
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
                    1. Introducción
                  </h2>
                  <p>
                    Panthera Fitness Alburquerque ("nosotros", "nuestro") respeta tu privacidad 
                    y está comprometido a proteger tus datos personales. Esta Política de Privacidad 
                    describe cómo recopilamos, usamos y protegemos tu información cuando utilizas 
                    nuestra aplicación móvil.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    2. Información que Recopilamos
                  </h2>
                  <p className="mb-2">Recopilamos los siguientes tipos de información:</p>
                  
                  <h3 className="font-medium text-foreground mt-3 mb-1">2.1 Información de Contacto</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Dirección de correo electrónico</li>
                    <li>Número de teléfono (opcional)</li>
                    <li>Nombre y apellidos</li>
                  </ul>

                  <h3 className="font-medium text-foreground mt-3 mb-1">2.2 Información de Salud y Fitness</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Peso (opcional, para cálculos de fitness)</li>
                    <li>Altura (opcional, para cálculos de fitness)</li>
                    <li>Fecha de nacimiento</li>
                  </ul>

                  <h3 className="font-medium text-foreground mt-3 mb-1">2.3 Identificadores</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>ID de usuario único</li>
                    <li>Tokens de autenticación</li>
                  </ul>

                  <h3 className="font-medium text-foreground mt-3 mb-1">2.4 Datos de Uso</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Historial de reservas de clases</li>
                    <li>Registros de acceso al gimnasio</li>
                    <li>Preferencias de la aplicación</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    3. Cómo Usamos tu Información
                  </h2>
                  <p>Utilizamos tu información para:</p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Gestionar tu cuenta y autenticación</li>
                    <li>Procesar reservas de clases</li>
                    <li>Enviarte recordatorios y notificaciones sobre tus clases</li>
                    <li>Proporcionar cálculos de fitness personalizados (IMC, calorías, etc.)</li>
                    <li>Mejorar nuestros servicios y experiencia de usuario</li>
                    <li>Comunicarnos contigo sobre tu membresía</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    4. Almacenamiento y Seguridad de Datos
                  </h2>
                  <p>
                    Tus datos se almacenan de forma segura en servidores protegidos. Implementamos 
                    medidas de seguridad técnicas y organizativas apropiadas para proteger tus 
                    datos personales contra el acceso no autorizado, alteración, divulgación o 
                    destrucción.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    5. Compartir Información
                  </h2>
                  <p>
                    No vendemos, alquilamos ni compartimos tu información personal con terceros 
                    para fines de marketing. Solo compartimos datos cuando es necesario para:
                  </p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Procesar pagos (con nuestro procesador de pagos seguro)</li>
                    <li>Cumplir con obligaciones legales</li>
                    <li>Proteger nuestros derechos legales</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    6. Tus Derechos
                  </h2>
                  <p>Tienes derecho a:</p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Acceder a tus datos personales</li>
                    <li>Rectificar datos inexactos</li>
                    <li>Solicitar la eliminación de tus datos</li>
                    <li>Oponerte al procesamiento de tus datos</li>
                    <li>Solicitar la portabilidad de tus datos</li>
                  </ul>
                  <p className="mt-2">
                    Para ejercer estos derechos, contacta con nosotros a través de los medios 
                    indicados al final de esta política.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    7. Retención de Datos
                  </h2>
                  <p>
                    Conservamos tus datos personales mientras mantengas una cuenta activa con 
                    nosotros. Si solicitas la eliminación de tu cuenta, eliminaremos tus datos 
                    personales dentro de un plazo razonable, excepto cuando la ley nos obligue 
                    a conservarlos.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    8. Menores de Edad
                  </h2>
                  <p>
                    Esta aplicación no está dirigida a menores de 16 años. No recopilamos 
                    intencionadamente información de menores sin el consentimiento de sus 
                    padres o tutores legales.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    9. Cambios en esta Política
                  </h2>
                  <p>
                    Podemos actualizar esta Política de Privacidad ocasionalmente. Te notificaremos 
                    sobre cambios significativos a través de la aplicación o por correo electrónico.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    10. Contacto
                  </h2>
                  <p>
                    Si tienes preguntas sobre esta Política de Privacidad o sobre cómo manejamos 
                    tus datos, contáctanos:
                  </p>
                  <ul className="list-none space-y-1 mt-2">
                    <li><strong>Empresa:</strong> Panthera Fitness Alburquerque</li>
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
