import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MapPin, Phone, Mail, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import pan1 from "@/assets/pan1.jpeg";
import pan2 from "@/assets/pan2.jpeg";
import pan3 from "@/assets/pan3.jpeg";
import pan4 from "@/assets/pan4.jpeg";
import pan5 from "@/assets/pan5.jpeg";
import pan6 from "@/assets/pan6.jpeg";
import pan7 from "@/assets/pan7.jpeg";
import pan8 from "@/assets/pan8.jpeg";
import pan9 from "@/assets/pan9.jpeg";
import pan10 from "@/assets/pan10.jpeg";
import pan11 from "@/assets/pan11.jpeg";
import pan12 from "@/assets/pan12.jpeg";
import pan13 from "@/assets/pan13.jpeg";
import pan14 from "@/assets/pan14.jpeg";
import pan15 from "@/assets/pan15.jpeg";
import pan16 from "@/assets/pan16.jpeg";

export default function GymInfo() {
  const gymLocation = "CF El prado 3, 06510 Alburquerque Badajoz";

  const gymImages = [
    { src: pan7, alt: "Panthera Alburquerque - Exterior del Centro" },
    { src: pan10, alt: "Panthera Alburquerque - Kettlebells y Pesas" },
    { src: pan12, alt: "Panthera Alburquerque - Vista General del Gimnasio" },
    { src: pan13, alt: "Panthera Alburquerque - Zona de GAP" },
    { src: pan14, alt: "Panthera Alburquerque - Área de Pesas Libres" },
    { src: pan16, alt: "Panthera Alburquerque - Espejo del Gimnasio" },
    { src: pan8, alt: "Panthera Alburquerque - Entrada y Recepción" },
    { src: pan9, alt: "Panthera Alburquerque - Zona de Entrenamiento" },
    { src: pan1, alt: "Panthera Alburquerque - Sala Principal" },
    { src: pan2, alt: "Panthera Alburquerque - Equipamiento" },
    { src: pan3, alt: "Panthera Alburquerque - Zona de Entrenamiento" },
    { src: pan4, alt: "Panthera Alburquerque - Máquinas" },
    { src: pan5, alt: "Panthera Alburquerque - Detalles" },
    { src: pan6, alt: "Panthera Alburquerque - Discos y Pesas" },
  ];

  return (
    <div className="container py-2 sm:py-4 md:py-8 px-2 sm:px-4">
      <h1 className="font-bebas text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl tracking-wider text-primary drop-shadow-[0_0_30px_hsl(var(--primary)/0.7)] mb-4 sm:mb-6 md:mb-8 text-center">
        DATOS DEL CENTRO
      </h1>

      {/* Carrusel de imágenes */}
      <Card className="mb-4 sm:mb-6 md:mb-8 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_40px_rgba(59,130,246,0.15)]">
        <CardHeader className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
          <CardTitle className="font-bebas text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-wider text-center text-primary px-2">
            NUESTRAS INSTALACIONES
          </CardTitle>
        </CardHeader>
        <CardContent className="px-1 sm:px-2 md:px-6">
          <Carousel className="w-full max-w-4xl mx-auto">
            <CarouselContent>
              {gymImages.map((image, index) => (
                <CarouselItem key={index}>
                  <div className="relative aspect-video rounded-lg overflow-hidden">
                    <img src={image.src} alt={image.alt} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-3 md:p-4">
                      <p className="text-white font-bebas text-xs sm:text-sm md:text-base lg:text-xl xl:text-2xl tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        {image.alt}
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-0.5 sm:left-1 md:left-2 h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10" />
            <CarouselNext className="right-0.5 sm:right-1 md:right-2 h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10" />
          </Carousel>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
          <CardHeader className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            <CardTitle className="flex items-center gap-2 font-bebas text-base sm:text-lg md:text-xl lg:text-2xl tracking-wider">
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
              Ubicación
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 md:px-6">
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">{gymLocation}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
          <CardHeader className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            <CardTitle className="flex items-center gap-2 font-bebas text-base sm:text-lg md:text-xl lg:text-2xl tracking-wider">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
              Horario Provisional
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 md:px-6">
            <div className="space-y-1 text-xs sm:text-sm md:text-base text-muted-foreground">
              <p>Mañanas: 9:00 - 14:00</p>
              <p>Tardes: 17:00 - 22:00</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
          <CardHeader className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            <CardTitle className="flex items-center gap-2 font-bebas text-base sm:text-lg md:text-xl lg:text-2xl tracking-wider">
              <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
              Teléfono
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 md:px-6">
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">+34 623616950</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
          <CardHeader className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            <CardTitle className="flex items-center gap-2 font-bebas text-base sm:text-lg md:text-xl lg:text-2xl tracking-wider">
              <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
              Email
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 md:px-6">
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground break-all">pantherafitnessalburquerque@gmail.com</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
