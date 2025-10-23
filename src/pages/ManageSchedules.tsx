import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Calendar, Clock, Users } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ClassType {
  id: string;
  name: string;
}

interface Schedule {
  id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  max_capacity: number;
  week_start_date: string;
  classes: { name: string } | null;
  bookings: { count: number }[];
}

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function ManageSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form state
  const [classId, setClassId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [maxCapacity, setMaxCapacity] = useState("20");

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos para ver esta página",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAdmin, roleLoading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const getWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay; // If Sunday, go back 6 days, else go to Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const loadData = async () => {
    setLoading(true);
    
    // Get current week's Monday
    const today = new Date();
    const currentDay = today.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay; // If Sunday, go back 6 days, else go to Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    const weekStartDate = monday.toISOString().split('T')[0];

    // Load classes
    const { data: classesData } = await supabase
      .from("classes")
      .select("id, name")
      .order("name");

    if (classesData) {
      setClasses(classesData);
    }

    // Load schedules for current week
    const { data: schedulesData, error } = await supabase
      .from("class_schedules")
      .select(`
        *,
        classes:class_id (name),
        bookings:class_bookings(count)
      `)
      .eq("week_start_date", weekStartDate)
      .order("day_of_week")
      .order("start_time");

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los horarios",
        variant: "destructive",
      });
    } else {
      setSchedules(schedulesData || []);
    }

    setLoading(false);
  };

  const handleCreateSchedule = async () => {
    if (!classId || !dayOfWeek || !startTime || !durationMinutes || !maxCapacity) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      });
      return;
    }

    // Get current week's Monday
    const today = new Date();
    const currentDay = today.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    const weekStartDate = monday.toISOString().split('T')[0];

    const { error } = await supabase
      .from("class_schedules")
      .insert({
        class_id: classId,
        day_of_week: parseInt(dayOfWeek),
        start_time: startTime,
        duration_minutes: parseInt(durationMinutes),
        max_capacity: parseInt(maxCapacity),
        week_start_date: weekStartDate,
      });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el horario",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Horario creado",
        description: "El horario se ha creado correctamente",
      });
      setDialogOpen(false);
      resetForm();
      loadData();
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    const { error } = await supabase
      .from("class_schedules")
      .delete()
      .eq("id", scheduleId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el horario",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Horario eliminado",
        description: "El horario se ha eliminado correctamente",
      });
      loadData();
    }
  };

  const resetForm = () => {
    setClassId("");
    setDayOfWeek("1");
    setStartTime("09:00");
    setDurationMinutes("60");
    setMaxCapacity("20");
  };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // Group schedules by day
  const schedulesByDay = schedules.reduce((acc, schedule) => {
    if (!acc[schedule.day_of_week]) {
      acc[schedule.day_of_week] = [];
    }
    acc[schedule.day_of_week].push(schedule);
    return acc;
  }, {} as Record<number, Schedule[]>);

  const weekDates = getWeekDates();

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Gestión de Horarios Semanales</CardTitle>
            <CardDescription>Crea y gestiona los horarios de las clases para esta semana</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Horario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Horario</DialogTitle>
                <DialogDescription>
                  Añade un nuevo horario para esta semana
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="class">Clase</Label>
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger id="class">
                      <SelectValue placeholder="Selecciona una clase" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="day">Día de la semana</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger id="day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((day, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Hora de inicio</Label>
                  <Input
                    id="time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duración (minutos)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacidad máxima</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateSchedule}>Crear Horario</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay horarios configurados para esta semana
            </div>
          ) : (
            <div className="space-y-6">
              {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
                 const daySchedules = schedulesByDay[dayNum] || [];
                // Map day_of_week (0=Sunday, 1=Monday, ..., 6=Saturday) to weekDates index
                const weekDateIndex = dayNum === 0 ? 6 : dayNum - 1;
                const dayDate = weekDates[weekDateIndex];
                
                if (!dayDate) return null;
                
                const dateStr = dayDate.toLocaleDateString('es-ES', { 
                  day: 'numeric', 
                  month: 'long'
                });

                return (
                  <div key={dayNum} className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {DAYS[dayNum]} - {dateStr}
                    </h3>
                    {daySchedules.length === 0 ? (
                      <p className="text-sm text-muted-foreground pl-7">No hay clases programadas</p>
                    ) : (
                      <div className="space-y-2">
                        {daySchedules.map((schedule) => {
                          const bookingCount = schedule.bookings[0]?.count || 0;
                          return (
                            <div
                              key={schedule.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                            >
                              <div className="flex-1 space-y-1">
                                <p className="font-medium">{schedule.classes?.name}</p>
                                <div className="flex gap-2 text-sm text-muted-foreground">
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="mr-1 h-3 w-3" />
                                    {schedule.start_time.slice(0, 5)} ({schedule.duration_minutes} min)
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    <Users className="mr-1 h-3 w-3" />
                                    {bookingCount}/{schedule.max_capacity}
                                  </Badge>
                                </div>
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción eliminará el horario y todas las reservas asociadas.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteSchedule(schedule.id)}>
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
