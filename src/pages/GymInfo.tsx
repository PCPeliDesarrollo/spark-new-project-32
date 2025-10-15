import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MapPin, Phone, Mail, Users } from "lucide-react";

export default function GymInfo() {
  return (
    <div className="container py-8">
      <h1 className="text-4xl font-bold mb-8 text-primary">Datos del Centro</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Ubicación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Calle Fitness, 123<br />
              28001 Madrid, España
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Horario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-muted-foreground">
              <p>Lunes - Viernes: 6:00 - 23:00</p>
              <p>Sábados: 8:00 - 21:00</p>
              <p>Domingos: 9:00 - 15:00</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Teléfono
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">+34 910 123 456</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">info@fitgym.es</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Instalaciones
            </CardTitle>
            <CardDescription>
              Todo lo que necesitas para entrenar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-muted-foreground">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Zona de Cardio</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>20 cintas de correr</li>
                  <li>15 bicicletas estáticas</li>
                  <li>10 elípticas</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Zona de Pesas</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Mancuernas de 1-50 kg</li>
                  <li>Máquinas de musculación</li>
                  <li>Zona de peso libre</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Clases Dirigidas</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Spinning</li>
                  <li>Yoga</li>
                  <li>Pilates</li>
                  <li>Zumba</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Servicios</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Vestuarios con duchas</li>
                  <li>Taquillas individuales</li>
                  <li>Zona de relax</li>
                  <li>WiFi gratuito</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
