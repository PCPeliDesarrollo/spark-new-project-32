import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, isBefore, setHours, setMinutes, addHours } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FreeTrainingBookingProps {
  classId: string;
  className: string;
  userId: string;
  onBookingSuccess: () => void;
  isBlocked: boolean;
  canBookClasses: boolean;
}

export function FreeTrainingBooking({ 
  classId, 
  className, 
  userId, 
  onBookingSuccess,
  isBlocked,
  canBookClasses
}: FreeTrainingBookingProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [isBooking, setIsBooking] = useState(false);
  const [myBookings, setMyBookings] = useState<any[]>([]);

  // Load user's bookings on mount
  useEffect(() => {
    loadMyBookings();
  }, [userId]);

  const loadMyBookings = async () => {
    const { data, error } = await supabase
      .from("class_bookings")
      .select(`
        id,
        class_date,
        status,
        class_schedules!inner (
          class_id,
          start_time
        )
      `)
      .eq("user_id", userId)
      .eq("class_schedules.class_id", classId)
      .eq("status", "confirmed")
      .gte("class_date", format(new Date(), 'yyyy-MM-dd'))
      .order("class_date", { ascending: true });

    if (!error && data) {
      setMyBookings(data);
    }
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Error",
        description: "Selecciona una fecha y hora",
        variant: "destructive",
      });
      return;
    }

    if (isBlocked) {
      toast({
        title: "Cuenta bloqueada",
        description: "Tu cuenta está bloqueada. Contacta con un administrador.",
        variant: "destructive",
      });
      return;
    }

    if (!canBookClasses) {
      toast({
        title: "No puedes reservar",
        description: "Tu suscripción no incluye clases.",
        variant: "destructive",
      });
      return;
    }

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const bookingDateTime = setMinutes(setHours(selectedDate, hours), minutes);
    const now = new Date();

    // Verificar que la fecha/hora sea futura
    if (isBefore(bookingDateTime, now)) {
      toast({
        title: "Error",
        description: "No puedes reservar en el pasado",
        variant: "destructive",
      });
      return;
    }

    setIsBooking(true);

    try {
      // Crear un schedule temporal para este entrenamiento libre
      // Usamos un schedule "virtual" que se crea por usuario
      const { data: scheduleData, error: scheduleError } = await supabase
        .from("class_schedules")
        .insert({
          class_id: classId,
          day_of_week: selectedDate.getDay(),
          start_time: selectedTime + ":00",
          duration_minutes: 60, // 1 hora por defecto
          max_capacity: 1, // Solo este usuario
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      // Crear la reserva
      const { error: bookingError } = await supabase
        .from("class_bookings")
        .insert({
          schedule_id: scheduleData.id,
          user_id: userId,
          class_date: format(selectedDate, 'yyyy-MM-dd'),
          status: "confirmed",
        });

      if (bookingError) {
        // Si falla la reserva, eliminar el schedule creado
        await supabase
          .from("class_schedules")
          .delete()
          .eq("id", scheduleData.id);
        throw bookingError;
      }

      toast({
        title: "¡Reservado!",
        description: `Entrenamiento libre el ${format(selectedDate, "d 'de' MMMM", { locale: es })} a las ${selectedTime}`,
      });

      setSelectedDate(undefined);
      setSelectedTime("09:00");
      loadMyBookings();
      onBookingSuccess();
    } catch (error: any) {
      console.error("Error creating booking:", error);
      
      if (error.message?.includes("check_booking_limit")) {
        toast({
          title: "Límite alcanzado",
          description: "Has alcanzado tu límite de clases este mes",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo realizar la reserva",
          variant: "destructive",
        });
      }
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelBooking = async (bookingId: string, classDate: string, startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const bookingDate = new Date(classDate);
    const bookingDateTime = setMinutes(setHours(bookingDate, hours), minutes);
    const now = new Date();
    const oneHourBefore = addHours(bookingDateTime, -1);

    // Check if cancellation is within allowed time
    if (isBefore(oneHourBefore, now)) {
      toast({
        title: "No se puede cancelar",
        description: "No puedes cancelar con menos de 1 hora de antelación. La clase se descontará de tu cuota.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the schedule_id before deleting
      const { data: bookingData } = await supabase
        .from("class_bookings")
        .select("schedule_id")
        .eq("id", bookingId)
        .single();

      const { error } = await supabase
        .from("class_bookings")
        .delete()
        .eq("id", bookingId);

      if (error) throw error;

      // Delete the virtual schedule if it was for free training
      if (bookingData?.schedule_id) {
        await supabase
          .from("class_schedules")
          .delete()
          .eq("id", bookingData.schedule_id)
          .eq("max_capacity", 1); // Solo eliminar schedules virtuales
      }

      toast({
        title: "Reserva cancelada",
        description: "Tu reserva ha sido cancelada correctamente",
      });

      loadMyBookings();
      onBookingSuccess();
    } catch (error) {
      console.error("Error canceling booking:", error);
      toast({
        title: "Error",
        description: "No se pudo cancelar la reserva",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Puedes entrenar en cualquier horario durante 1 hora. Esta clase se descontará de tu cuota mensual.
          <strong> Recuerda cancelar con al menos 1 hora de antelación</strong> si no vas a asistir, o la clase se descontará igualmente.
        </AlertDescription>
      </Alert>

      {myBookings.length > 0 && (
        <Card className="bg-card/80 backdrop-blur-md border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg">Mis Entrenamientos Libres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {myBookings.map((booking) => {
              const bookingDate = new Date(booking.class_date);
              const [hours, minutes] = booking.class_schedules.start_time.split(':');
              const bookingDateTime = setMinutes(setHours(bookingDate, parseInt(hours)), parseInt(minutes));
              const oneHourBefore = addHours(bookingDateTime, -1);
              const canCancel = isBefore(new Date(), oneHourBefore);

              return (
                <div key={booking.id} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                  <div>
                    <p className="font-medium">
                      {format(bookingDate, "d 'de' MMMM", { locale: es })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.class_schedules.start_time.substring(0, 5)} - 1 hora
                    </p>
                  </div>
                  <Button
                    variant={canCancel ? "outline" : "ghost"}
                    size="sm"
                    onClick={() => handleCancelBooking(booking.id, booking.class_date, booking.class_schedules.start_time)}
                    disabled={!canCancel}
                  >
                    {canCancel ? "Cancelar" : "No cancelable"}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card className="bg-card/80 backdrop-blur-md border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl">Reservar Entrenamiento Libre</CardTitle>
          <CardDescription>
            Elige la fecha y hora que mejor te venga
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <CalendarIcon className="h-4 w-4" />
              Fecha
            </Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => isBefore(date, new Date()) || date < new Date()}
              locale={es}
              className="rounded-md border"
            />
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4" />
              Hora de inicio
            </Label>
            <Input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="max-w-[200px]"
            />
          </div>

          {selectedDate && (
            <div className="p-4 bg-accent/30 rounded-lg">
              <p className="text-sm">
                <strong>Resumen:</strong> {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })} a las {selectedTime}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Duración: 1 hora
              </p>
            </div>
          )}

          <Button
            onClick={handleBooking}
            disabled={!selectedDate || !selectedTime || isBooking || isBlocked || !canBookClasses}
            className="w-full"
          >
            {isBooking ? "Reservando..." : "Confirmar Reserva"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
