import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Calendar, Clock, Users, Lock, UserPlus } from "lucide-react";
import { useBlockedStatus } from "@/hooks/useBlockedStatus";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, addDays, startOfWeek, isBefore, parseISO, setHours, setMinutes } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";

interface ClassData {
  id: string;
  name: string;
  description: string;
  image_url: string;
}

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface Schedule {
  id: string;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  max_capacity: number;
  bookings: { count: number }[];
  week_start_date: string;
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

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function ClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isBlocked } = useBlockedStatus();
  const { isAdmin, role, canBookClasses } = useUserRole();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Record<string, Booking[]>>({});
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [showAdminBookingDialog, setShowAdminBookingDialog] = useState(false);
  const [adminBookingScheduleId, setAdminBookingScheduleId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [openUserSelect, setOpenUserSelect] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      // Get users with their roles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id, 
          full_name, 
          email,
          user_roles (role)
        `)
        .order("full_name");
      
      if (profilesError) throw profilesError;

      // Map users with their roles and filter those who can book classes
      const usersWithRoles = (profilesData || [])
        .map((profile: any) => ({
          id: profile.id,
          full_name: profile.full_name || 'Sin nombre',
          email: profile.email || '',
          role: profile.user_roles?.[0]?.role || 'basica'
        }))
        .filter((user: UserWithRole) => 
          user.role === 'basica_clases' || 
          user.role === 'full' || 
          user.role === 'admin'
        );
      
      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

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
      
      // Filter out past schedules (by specific day and time)
      const now = new Date();
      const filteredSchedules = (schedulesData || []).filter(schedule => {
        const weekStart = startOfWeek(parseISO(schedule.week_start_date), { weekStartsOn: 1 });
        const scheduleDate = addDays(weekStart, schedule.day_of_week);
        const [hours, minutes] = schedule.start_time.split(':').map(Number);
        const scheduleDateTime = setMinutes(setHours(scheduleDate, hours), minutes);
        return !isBefore(scheduleDateTime, now);
      });
      
      setSchedules(filteredSchedules);

      // Load bookings for each schedule
      if (filteredSchedules) {
        const bookingsData: Record<string, Booking[]> = {};
        for (const schedule of filteredSchedules) {
          const { data, error } = await supabase
            .from("class_bookings")
            .select(`
              user_id,
              status,
              position,
              profiles!left (
                full_name,
                avatar_url
              )
            `)
            .eq("schedule_id", schedule.id)
            .order("status", { ascending: true })
            .order("position", { ascending: true, nullsFirst: false });

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

  const handleBooking = async (scheduleId: string, targetUserId?: string) => {
    const bookingUserId = targetUserId || userId;
    
    if (!bookingUserId) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para apuntarte",
        variant: "destructive",
      });
      return;
    }

    if (!targetUserId && isBlocked) {
      toast({
        title: "Cuenta bloqueada",
        description: "Tu cuenta ha sido bloqueada. Contacta con el administrador.",
        variant: "destructive",
      });
      return;
    }

    try {
      const isBooked = bookings[scheduleId]?.some(b => b.user_id === bookingUserId);

      if (isBooked) {
        // Check if cancellation is at least 1 hour before class (only for regular users)
        if (!targetUserId) {
          const schedule = schedules.find(s => s.id === scheduleId);
          if (schedule) {
            const weekStart = startOfWeek(parseISO(schedule.week_start_date), { weekStartsOn: 1 });
            const scheduleDate = addDays(weekStart, schedule.day_of_week);
            const [hours, minutes] = schedule.start_time.split(':').map(Number);
            const scheduleDateTime = setMinutes(setHours(scheduleDate, hours), minutes);
            const oneHourBefore = new Date(scheduleDateTime.getTime() - 60 * 60 * 1000);
            
            if (new Date() >= oneHourBefore) {
              toast({
                title: "No se puede cancelar",
                description: "Debes cancelar con al menos 1 hora de antelación",
                variant: "destructive",
              });
              return;
            }
          }
        }

        // Cancel booking
        const { error } = await supabase
          .from("class_bookings")
          .delete()
          .eq("schedule_id", scheduleId)
          .eq("user_id", bookingUserId);

        if (error) throw error;

        toast({
          title: "Cancelado",
          description: targetUserId ? "Usuario dado de baja de la clase" : "Te has dado de baja de esta clase",
        });
      } else {
        // Create booking
        const { error } = await supabase
          .from("class_bookings")
          .insert({
            schedule_id: scheduleId,
            user_id: bookingUserId,
          });

        if (error) throw error;

        toast({
          title: "¡Apuntado!",
          description: targetUserId ? "Usuario apuntado a la clase" : "Te has apuntado a esta clase",
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

  const handleAdminBooking = () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un usuario",
        variant: "destructive",
      });
      return;
    }
    
    if (adminBookingScheduleId) {
      handleBooking(adminBookingScheduleId, selectedUserId);
      setShowAdminBookingDialog(false);
      setSelectedUserId("");
      setAdminBookingScheduleId(null);
    }
  };

  const openAdminBookingDialog = (scheduleId: string) => {
    setAdminBookingScheduleId(scheduleId);
    setShowAdminBookingDialog(true);
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
    <div className="container py-4 md:py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate("/classes")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      {isBlocked && (
        <Alert variant="destructive" className="mb-4 border-destructive/50 bg-destructive/10">
          <Lock className="h-4 w-4" />
          <AlertTitle>Cuenta bloqueada</AlertTitle>
          <AlertDescription>
            Tu cuenta ha sido bloqueada por el administrador. No puedes reservar clases.
          </AlertDescription>
        </Alert>
      )}

      {!canBookClasses && !isBlocked && role === "basica" && (
        <Alert className="mb-4 border-primary/50 bg-primary/10">
          <Lock className="h-4 w-4" />
          <AlertTitle>Suscripción Básica</AlertTitle>
          <AlertDescription>
            Tu suscripción actual solo incluye acceso a las máquinas del gimnasio. Para apuntarte a clases, contacta con un administrador para actualizar tu suscripción a Básica + Clases o Full.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_40px_rgba(59,130,246,0.15)]">
            <div className="aspect-video w-full overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
              <img
                src={classData.image_url || "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800"}
                alt={classData.name}
                className="w-full h-full object-cover"
              />
            </div>
            <CardHeader className="text-center">
              <CardTitle className="font-bebas text-3xl md:text-5xl tracking-wider bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(59,130,246,0.6)]">
                {classData.name}
              </CardTitle>
              <CardDescription className="text-base">
                {classData.description}
              </CardDescription>
            </CardHeader>
          </Card>

          {schedules.length > 0 && (
            <Card className="mt-4 md:mt-6 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_40px_rgba(59,130,246,0.15)]">
              <CardHeader className="text-center">
                <CardTitle className="font-bebas text-2xl md:text-4xl tracking-wider bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                  HORARIOS DE LA SEMANA
                </CardTitle>
                <CardDescription>
                  Selecciona un horario para apuntarte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {
                schedules.map((schedule) => {
                  const userBooking = bookings[schedule.id]?.find(b => b.user_id === userId);
                  const confirmedBookings = bookings[schedule.id]?.filter(b => b.status === 'confirmed') || [];
                  const waitlistBookings = bookings[schedule.id]?.filter(b => b.status === 'waitlist') || [];
                  const confirmedCount = confirmedBookings.length;
                  const isFull = confirmedCount >= schedule.max_capacity;
                  const isBooked = !!userBooking;
                  const isOnWaitlist = userBooking?.status === 'waitlist';
                  
                  // Calculate actual date
                  const weekStart = startOfWeek(parseISO(schedule.week_start_date), { weekStartsOn: 1 });
                  const scheduleDate = addDays(weekStart, schedule.day_of_week);
                  const formattedDate = format(scheduleDate, "EEEE d", { locale: es });

                  return (
                    <div
                      key={schedule.id}
                      className="flex flex-col p-3 md:p-4 border border-primary/20 rounded-lg hover:bg-accent/50 hover:border-primary/40 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              <Calendar className="mr-1 h-3 w-3" />
                              {formattedDate}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="mr-1 h-3 w-3" />
                              {schedule.start_time.slice(0, 5)}
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
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button
                            variant={isBooked ? "destructive" : "default"}
                            onClick={() => handleBooking(schedule.id)}
                            className="flex-1 sm:flex-none text-xs sm:text-sm bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary transition-all duration-300"
                            size="sm"
                            disabled={isBlocked || !canBookClasses}
                          >
                            {isBooked ? "Cancelar" : isFull ? "Lista de espera" : !canBookClasses ? "No disponible" : "Apuntarse"}
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openAdminBookingDialog(schedule.id)}
                              className="text-xs"
                            >
                              <UserPlus className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSchedule(
                              selectedSchedule === schedule.id ? null : schedule.id
                            )}
                            className="text-xs"
                          >
                            {selectedSchedule === schedule.id ? "Ocultar" : "Ver"}
                          </Button>
                        </div>
                      </div>
                      
                      {selectedSchedule === schedule.id && bookings[schedule.id] && (
                        <div className="space-y-3 pt-3 border-t border-primary/10">
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
                })
                }
              </CardContent>
            </Card>
          )}
        </div>

        {schedules.length > 0 && (
          <div className="lg:sticky lg:top-4">
            <Card className="bg-gradient-to-br from-card/90 to-card/50 backdrop-blur-md border-primary/30 shadow-[0_0_40px_rgba(59,130,246,0.15)]">
              <CardHeader className="text-center">
                <CardTitle className="font-bebas text-2xl tracking-wider bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                  INFORMACIÓN
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {schedules[0]?.duration_minutes && (
                  <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium mb-1">Duración</p>
                    <p className="font-bebas text-2xl text-primary">
                      {schedules[0].duration_minutes} MIN
                    </p>
                  </div>
                )}
                {schedules[0]?.max_capacity && (
                  <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium mb-1">Capacidad máxima</p>
                    <p className="font-bebas text-2xl text-primary">
                      {schedules[0].max_capacity} PERSONAS
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={showAdminBookingDialog} onOpenChange={setShowAdminBookingDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Apuntar usuario a la clase</DialogTitle>
            <DialogDescription>
              Busca y selecciona el usuario que deseas apuntar a esta clase
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Popover open={openUserSelect} onOpenChange={setOpenUserSelect}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openUserSelect}
                  className="w-full justify-between"
                >
                  {selectedUserId
                    ? users.find((user) => user.id === selectedUserId)?.full_name
                    : "Buscar usuario..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[460px] p-0 bg-popover z-50">
                <Command>
                  <CommandInput placeholder="Buscar por nombre o email..." />
                  <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-auto">
                    {users.map((user) => {
                      const roleLabels: Record<string, string> = {
                        'basica_clases': 'Básica + Clases',
                        'full': 'Full',
                        'admin': 'Admin'
                      };
                      
                      return (
                        <CommandItem
                          key={user.id}
                          value={`${user.full_name} ${user.email}`}
                          onSelect={() => {
                            setSelectedUserId(user.id);
                            setOpenUserSelect(false);
                          }}
                          className="cursor-pointer"
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedUserId === user.id ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          <div className="flex-1 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="font-medium">{user.full_name}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {roleLabels[user.role] || user.role}
                            </Badge>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowAdminBookingDialog(false);
                setSelectedUserId("");
                setAdminBookingScheduleId(null);
                setOpenUserSelect(false);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleAdminBooking}>
              Apuntar usuario
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
