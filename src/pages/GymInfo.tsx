import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MapPin, Phone, Mail, Users, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import pan1 from "@/assets/pan1.jpeg";
import pan2 from "@/assets/pan2.jpeg";
import pan3 from "@/assets/pan3.jpeg";
import pan4 from "@/assets/pan4.jpeg";
import pan5 from "@/assets/pan5.jpeg";
import pan6 from "@/assets/pan6.jpeg";

export default function GymInfo() {
  const gymLocation = "CF El Prado, 3 06510, Alburquerque (Badajoz) España";
  const gymCoordinates = "40.4168,-3.7038";

  const handleOpenMaps = () => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gymLocation)}`;
    window.open(mapsUrl, "_blank");
  };

  const gymImages = [
    { src: pan1, alt: "Panthera Alburquerque - Sala Principal" },
    { src: pan2, alt: "Panthera Alburquerque - Equipamiento" },
    { src: pan3, alt: "Panthera Alburquerque - Zona de Entrenamiento" },
    { src: pan4, alt: "Panthera Alburquerque - Máquinas" },
    { src: pan5, alt: "Panthera Alburquerque - Detalles" },
    { src: pan6, alt: "Panthera Alburquerque - Discos y Pesas" },
  ];

  return (
    <div className="container py-8">
      <h1 className="font-bebas text-5xl md:text-6xl tracking-wider bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(59,130,246,0.8)] mb-8 text-center">
        DATOS DEL CENTRO
      </h1>

      {/* Carrusel de imágenes */}
      <Card className="mb-8 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_40px_rgba(59,130,246,0.15)]">
        <CardHeader>
          <CardTitle className="font-bebas text-3xl tracking-wider text-center bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            NUESTRAS INSTALACIONES
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Carousel className="w-full max-w-4xl mx-auto">
            <CarouselContent>
              {gymImages.map((image, index) => (
                <CarouselItem key={index}>
                  <div className="relative aspect-video rounded-lg overflow-hidden">
                    <img src={image.src} alt={image.alt} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <p className="text-white font-bebas text-2xl tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        {image.alt}
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bebas text-2xl tracking-wider">
              <MapPin className="h-5 w-5 text-primary" />
              Ubicación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">{gymLocation}</p>
            <Button
              onClick={handleOpenMaps}
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary"
            >
              <Navigation className="mr-2 h-4 w-4" />
              Abrir en Google Maps
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bebas text-2xl tracking-wider">
              <Clock className="h-5 w-5 text-primary" />
              Horario Provisional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-muted-foreground">
              <p>Mañanas: 9:00 - 14:00</p>
              <p>Tardes: 17:00 - 22:00</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bebas text-2xl tracking-wider">
              <Phone className="h-5 w-5 text-primary" />
              Teléfono
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">+34 623616950</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bebas text-2xl tracking-wider">
              <Mail className="h-5 w-5 text-primary" />
              Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">pantherafitnessalburquerque@gmail.com</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bebas text-2xl tracking-wider">
              <Users className="h-5 w-5 text-primary" />
              Instalaciones
            </CardTitle>
            <CardDescription>Todo lo que necesitas para entrenar</CardDescription>
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
                  <li>Yoga/Pilates</li>
                  <li>Musculación</li>
                  <li>Crosstrainning/Hyrox</li>
                  <li>Quemagrasa/GAP</li>
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
