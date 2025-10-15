import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Users, Loader2 } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";

interface Class {
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
  week_start_date: string;
  bookings: { count: number }[];
}

interface Booking {
  id: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

export default function Classes() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const { toast } = useToast();

  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  useEffect(() => {
    loadClasses();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("name");

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las clases",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSchedulesAndBookings = async (classId: string) => {
    try {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      
      const { data: schedulesData, error: schedulesError } = await supabase
        .from("class_schedules")
        .select(`
          *,
          bookings:class_bookings(count)
        `)
        .eq("class_id", classId)
        .eq("week_start_date", format(weekStart, "yyyy-MM-dd"))
        .order("day_of_week")
        .order("start_time");

      if (schedulesError) throw schedulesError;
      setSchedules(schedulesData || []);

      if (schedulesData && schedulesData.length > 0) {
        const scheduleIds = schedulesData.map(s => s.id);
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("class_bookings")
          .select(`
            id,
            user_id,
            profiles:user_id (
              full_name,
              avatar_url
            )
          `)
          .in("schedule_id", scheduleIds);

        if (bookingsError) throw bookingsError;
        setBookings(bookingsData || []);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los horarios",
        variant: "destructive",
      });
    }
  };

  const handleClassClick = async (classItem: Class) => {
    setSelectedClass(classItem);
    await loadSchedulesAndBookings(classItem.id);
  };

  const handleBooking = async (scheduleId: string) => {
    if (!currentUserId) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para reservar",
        variant: "destructive",
      });
      return;
    }

    setBookingLoading(true);
    try {
      const isBooked = bookings.some(
        b => schedules.find(s => s.id === scheduleId) && b.user_id === currentUserId
      );

      if (isBooked) {
        const { error } = await supabase
          .from("class_bookings")
          .delete()
          .eq("schedule_id", scheduleId)
          .eq("user_id", currentUserId);

        if (error) throw error;

        toast({
          title: "Reserva cancelada",
          description: "Has cancelado tu reserva para esta clase",
        });
      } else {
        const { error } = await supabase
          .from("class_bookings")
          .insert({
            schedule_id: scheduleId,
            user_id: currentUserId,
          });

        if (error) throw error;

        toast({
          title: "Reserva confirmada",
          description: "Te has inscrito correctamente a la clase",
        });
      }

      if (selectedClass) {
        await loadSchedulesAndBookings(selectedClass.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar la reserva",
        variant: "destructive",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const getBookingsForSchedule = (scheduleId: string) => {
    return bookings.filter(b => 
      schedules.find(s => s.id === scheduleId)
    );
  };

  const isUserBooked = (scheduleId: string) => {
    return bookings.some(
      b => schedules.find(s => s.id === scheduleId) && b.user_id === currentUserId
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-4xl font-bold mb-8 text-primary">Clases</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((classItem) => (
          <Card 
            key={classItem.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleClassClick(classItem)}
          >
            <div 
              className="h-48 bg-cover bg-center rounded-t-lg"
              style={{ backgroundImage: `url(${classItem.image_url})` }}
            />
            <CardHeader>
              <CardTitle>{classItem.name}</CardTitle>
              <CardDescription>{classItem.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedClass} onOpenChange={() => setSelectedClass(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedClass?.name}</DialogTitle>
            <DialogDescription>{selectedClass?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Horarios de esta semana
              </h3>
              
              {schedules.length === 0 ? (
                <p className="text-muted-foreground">No hay horarios disponibles para esta semana</p>
              ) : (
                <div className="space-y-3">
                  {schedules.map((schedule) => {
                    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
                    const scheduleDate = addDays(weekStart, schedule.day_of_week - 1);
                    const bookedCount = schedule.bookings[0]?.count || 0;
                    const isFull = bookedCount >= schedule.max_capacity;
                    const userBooked = isUserBooked(schedule.id);
                    
                    return (
                      <Card key={schedule.id} className={userBooked ? "border-primary" : ""}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">
                                  {daysOfWeek[schedule.day_of_week]}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {format(scheduleDate, "d 'de' MMMM", { locale: es })}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {schedule.start_time} ({schedule.duration_minutes} min)
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {bookedCount}/{schedule.max_capacity}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={userBooked ? "destructive" : "default"}
                              disabled={isFull && !userBooked || bookingLoading}
                              onClick={() => handleBooking(schedule.id)}
                            >
                              {bookingLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : userBooked ? (
                                "Cancelar"
                              ) : isFull ? (
                                "Completo"
                              ) : (
                                "Reservar"
                              )}
                            </Button>
                          </div>

                          {bookedCount > 0 && (
                            <div className="flex flex-wrap gap-2 pt-3 border-t">
                              {getBookingsForSchedule(schedule.id).map((booking) => (
                                <Avatar key={booking.id} className="h-8 w-8">
                                  <AvatarImage 
                                    src={booking.profiles.avatar_url} 
                                    alt={booking.profiles.full_name} 
                                  />
                                  <AvatarFallback className="text-xs">
                                    {booking.profiles.full_name?.charAt(0).toUpperCase() || '?'}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
