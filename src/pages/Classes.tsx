import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, Clock, Users, Lock, User } from "lucide-react";
import { useBlockedStatus } from "@/hooks/useBlockedStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, addDays, startOfWeek, isBefore, parseISO, setHours, setMinutes } from "date-fns";
import { es } from "date-fns/locale";

interface ClassWithSchedules {
  id: string;
  name: string;
  description: string;
  image_url: string;
  schedules: Schedule[];
}

interface Schedule {
  id: string;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  max_capacity: number;
  week_start_date: string;
  bookings: Booking[];
}

interface Booking {
  user_id: string;
  status: 'confirmed' | 'waitlist';
  position: number | null;
  profiles: {
    full_name: string;
    avatar_url: string;
  } | null;
}

export default function Classes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isBlocked } = useBlockedStatus();
  const [classes, setClasses] = useState<ClassWithSchedules[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      if (!user) {
        navigate("/auth");
        return;
      }

      // Load all classes
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("*")
        .order("name");

      if (classesError) throw classesError;

      // Load schedules and bookings for each class
      const classesWithSchedules: ClassWithSchedules[] = [];
      
      for (const classItem of classesData || []) {
        const { data: schedulesData, error: schedulesError } = await supabase
          .from("class_schedules")
          .select(`
            id,
            day_of_week,
            start_time,
            duration_minutes,
            max_capacity,
            week_start_date
          `)
          .eq("class_id", classItem.id)
          .order("day_of_week")
          .order("start_time");

        if (schedulesError) throw schedulesError;

        // Filter out past schedules
        const now = new Date();
        const futureSchedules = (schedulesData || []).filter(schedule => {
          const weekStart = startOfWeek(parseISO(schedule.week_start_date), { weekStartsOn: 1 });
          const scheduleDate = addDays(weekStart, schedule.day_of_week);
          const [hours, minutes] = schedule.start_time.split(':').map(Number);
          const scheduleDateTime = setMinutes(setHours(scheduleDate, hours), minutes);
          return !isBefore(scheduleDateTime, now);
        });

        // Load bookings for each schedule
        const schedulesWithBookings: Schedule[] = [];
        for (const schedule of futureSchedules) {
          const { data: bookingsData, error: bookingsError } = await supabase
            .from("class_bookings")
            .select(`
              user_id,
              status,
              position,
              profiles:user_id (
                full_name,
                avatar_url
              )
            `)
            .eq("schedule_id", schedule.id)
            .order("status", { ascending: true })
            .order("position", { ascending: true, nullsFirst: false });

          if (!bookingsError) {
            schedulesWithBookings.push({
              ...schedule,
              bookings: (bookingsData as any) || []
            });
          }
        }

        if (schedulesWithBookings.length > 0) {
          classesWithSchedules.push({
            ...classItem,
            schedules: schedulesWithBookings
          });
        }
      }

      setClasses(classesWithSchedules);
    } catch (error) {
      console.error("Error loading classes:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las clases",
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

    if (isBlocked) {
      toast({
        title: "Cuenta bloqueada",
        description: "Tu cuenta ha sido bloqueada. Contacta con el administrador.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find the booking
      let isBooked = false;
      for (const classItem of classes) {
        for (const schedule of classItem.schedules) {
          if (schedule.id === scheduleId) {
            isBooked = schedule.bookings.some(b => b.user_id === userId);
            break;
          }
        }
      }

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

  return (
    <div className="container py-4 md:py-8 px-4">
      <h1 className="font-bebas text-4xl md:text-6xl tracking-wider mb-6 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent text-center">
        CLASES DISPONIBLES
      </h1>

      {isBlocked && (
        <Alert variant="destructive" className="mb-6 border-destructive/50 bg-destructive/10">
          <Lock className="h-4 w-4" />
          <AlertTitle>Cuenta bloqueada</AlertTitle>
          <AlertDescription>
            Tu cuenta ha sido bloqueada por el administrador. No puedes reservar clases.
          </AlertDescription>
        </Alert>
      )}

      {classes.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No hay clases disponibles en este momento</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {classes.map((classItem) => (
            <Card key={classItem.id} className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_40px_rgba(59,130,246,0.15)] overflow-hidden">
              <div className="grid md:grid-cols-3 gap-0">
                {/* Image section */}
                <div className="relative h-48 md:h-auto">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/50 z-10"></div>
                  <img
                    src={classItem.image_url || "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800"}
                    alt={classItem.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content section */}
                <div className="md:col-span-2 p-6">
                  <CardHeader className="p-0 mb-4">
                    <CardTitle className="font-bebas text-3xl md:text-4xl tracking-wider bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                      {classItem.name}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {classItem.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-0">
                    <p className="font-semibold mb-3 text-sm text-muted-foreground">HORARIOS DE LA SEMANA</p>
                    <div className="space-y-3">
                      {classItem.schedules.map((schedule) => {
                        const userBooking = schedule.bookings.find(b => b.user_id === userId);
                        const confirmedBookings = schedule.bookings.filter(b => b.status === 'confirmed');
                        const waitlistBookings = schedule.bookings.filter(b => b.status === 'waitlist');
                        const confirmedCount = confirmedBookings.length;
                        const isFull = confirmedCount >= schedule.max_capacity;
                        const isBooked = !!userBooking;
                        const isOnWaitlist = userBooking?.status === 'waitlist';
                        
                        const weekStart = startOfWeek(parseISO(schedule.week_start_date), { weekStartsOn: 1 });
                        const scheduleDate = addDays(weekStart, schedule.day_of_week);
                        const formattedDate = format(scheduleDate, "EEEE d 'de' MMMM", { locale: es });

                        return (
                          <div
                            key={schedule.id}
                            className="flex flex-col p-3 border border-primary/20 rounded-lg hover:bg-accent/50 hover:border-primary/40 transition-all"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="text-xs capitalize">
                                  <Calendar className="mr-1 h-3 w-3" />
                                  {formattedDate}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="mr-1 h-3 w-3" />
                                  {schedule.start_time.slice(0, 5)} ({schedule.duration_minutes} min)
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  <Users className="mr-1 h-3 w-3" />
                                  {confirmedCount}/{schedule.max_capacity}
                                </Badge>
                                {waitlistBookings.length > 0 && (
                                  <Badge variant="secondary" className="text-xs bg-primary/20">
                                    +{waitlistBookings.length} en espera
                                  </Badge>
                                )}
                                {isOnWaitlist && (
                                  <Badge variant="secondary" className="text-xs bg-accent">
                                    Posición {userBooking.position}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant={isBooked ? "destructive" : "default"}
                                  onClick={() => handleBooking(schedule.id)}
                                  className="flex-1 sm:flex-none text-xs sm:text-sm"
                                  size="sm"
                                  disabled={isBlocked}
                                >
                                  {isBooked ? "Cancelar" : isFull ? "Lista de espera" : "Apuntarse"}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setExpandedSchedule(
                                    expandedSchedule === schedule.id ? null : schedule.id
                                  )}
                                  className="text-xs"
                                >
                                  <User className="h-3 w-3" />
                                  {expandedSchedule === schedule.id ? "Ocultar" : "Ver"}
                                </Button>
                              </div>
                            </div>
                            
                            {expandedSchedule === schedule.id && (
                              <div className="space-y-3 pt-3 mt-3 border-t border-primary/10">
                                {confirmedBookings.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                                      CONFIRMADOS ({confirmedBookings.length})
                                    </p>
                                    <div className="flex gap-2 flex-wrap">
                                      {confirmedBookings.map((booking, idx) => (
                                        <UserAvatar
                                          key={idx}
                                          avatarUrl={booking.profiles?.avatar_url || null}
                                          fullName={booking.profiles?.full_name || "Usuario"}
                                          size="sm"
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {waitlistBookings.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                                      LISTA DE ESPERA ({waitlistBookings.length})
                                    </p>
                                    <div className="flex gap-2 flex-wrap">
                                      {waitlistBookings.map((booking, idx) => (
                                        <div key={idx} className="relative">
                                          <UserAvatar
                                            avatarUrl={booking.profiles?.avatar_url || null}
                                            fullName={booking.profiles?.full_name || "Usuario"}
                                            size="sm"
                                          />
                                          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-accent">
                                            {booking.position}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
