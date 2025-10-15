import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Calendar, Clock, Users } from "lucide-react";

interface ClassData {
  id: string;
  name: string;
  description: string;
  image_url: string;
}

interface Schedule {
  id: string;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  max_capacity: number;
  bookings: { count: number }[];
}

interface Booking {
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function ClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Record<string, Booking[]>>({});

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      // Load class data
      const { data: classInfo, error: classError } = await supabase
        .from("classes")
        .select("*")
        .eq("id", id)
        .single();

      if (classError) throw classError;
      setClassData(classInfo);

      // Load schedules for current week
      const { data: schedulesData, error: schedulesError } = await supabase
        .from("class_schedules")
        .select(`
          *,
          bookings:class_bookings(count)
        `)
        .eq("class_id", id)
        .order("day_of_week")
        .order("start_time");

      if (schedulesError) throw schedulesError;
      setSchedules(schedulesData || []);

      // Load bookings for each schedule
      if (schedulesData) {
        const bookingsData: Record<string, Booking[]> = {};
        for (const schedule of schedulesData) {
          const { data, error } = await supabase
            .from("class_bookings")
            .select(`
              user_id,
              profiles:user_id (
                full_name,
                avatar_url
              )
            `)
            .eq("schedule_id", schedule.id);

          if (!error && data) {
            bookingsData[schedule.id] = data as any;
          }
        }
        setBookings(bookingsData);
      }
    } catch (error) {
      console.error("Error loading class:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la clase",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async (scheduleId: string) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para apuntarte",
        variant: "destructive",
      });
      return;
    }

    try {
      const isBooked = bookings[scheduleId]?.some(b => b.user_id === userId);

      if (isBooked) {
        // Cancel booking
        const { error } = await supabase
          .from("class_bookings")
          .delete()
          .eq("schedule_id", scheduleId)
          .eq("user_id", userId);

        if (error) throw error;

        toast({
          title: "Cancelado",
          description: "Te has dado de baja de esta clase",
        });
      } else {
        // Create booking
        const { error } = await supabase
          .from("class_bookings")
          .insert({
            schedule_id: scheduleId,
            user_id: userId,
          });

        if (error) throw error;

        toast({
          title: "¡Apuntado!",
          description: "Te has apuntado a esta clase",
        });
      }

      loadData();
    } catch (error) {
      console.error("Error with booking:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar la reserva",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="container py-8">
        <p>Clase no encontrada</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Button
        variant="ghost"
        onClick={() => navigate("/classes")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a clases
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="aspect-video w-full overflow-hidden">
              <img
                src={classData.image_url || "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800"}
                alt={classData.name}
                className="w-full h-full object-cover"
              />
            </div>
            <CardHeader>
              <CardTitle className="text-3xl">{classData.name}</CardTitle>
              <CardDescription className="text-base">
                {classData.description}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Horarios de la semana</CardTitle>
              <CardDescription>
                Selecciona un horario para apuntarte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {schedules.length === 0 ? (
                <p className="text-muted-foreground">No hay horarios disponibles</p>
              ) : (
                schedules.map((schedule) => {
                  const isBooked = bookings[schedule.id]?.some(b => b.user_id === userId);
                  const bookedCount = bookings[schedule.id]?.length || 0;
                  const isFull = bookedCount >= schedule.max_capacity;

                  return (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <Badge variant="outline">
                            <Calendar className="mr-1 h-3 w-3" />
                            {DAYS[schedule.day_of_week]}
                          </Badge>
                          <Badge variant="outline">
                            <Clock className="mr-1 h-3 w-3" />
                            {schedule.start_time.slice(0, 5)}
                          </Badge>
                          <Badge variant="outline">
                            <Users className="mr-1 h-3 w-3" />
                            {bookedCount}/{schedule.max_capacity}
                          </Badge>
                        </div>
                        {selectedSchedule === schedule.id && bookings[schedule.id] && (
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {bookings[schedule.id].map((booking, idx) => (
                              <UserAvatar
                                key={idx}
                                avatarUrl={booking.profiles.avatar_url}
                                fullName={booking.profiles.full_name}
                                size="sm"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={isBooked ? "destructive" : "default"}
                          onClick={() => handleBooking(schedule.id)}
                          disabled={!isBooked && isFull}
                        >
                          {isBooked ? "Cancelar" : isFull ? "Completo" : "Apuntarse"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSchedule(
                            selectedSchedule === schedule.id ? null : schedule.id
                          )}
                        >
                          {selectedSchedule === schedule.id ? "Ocultar" : "Ver inscritos"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Duración</p>
                <p className="text-sm text-muted-foreground">
                  {schedules[0]?.duration_minutes || 60} minutos
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Capacidad máxima</p>
                <p className="text-sm text-muted-foreground">
                  {schedules[0]?.max_capacity || 20} personas
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
