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
import { Loader2, Plus, Trash2, Calendar, Clock, Users, Pencil } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dumbbell, CalendarDays } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  month_start_date: string;
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateClassDialogOpen, setIsCreateClassDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [newClassName, setNewClassName] = useState("");
  const [newClassDescription, setNewClassDescription] = useState("");
  const [newClassImageUrl, setNewClassImageUrl] = useState("");
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
    
    // Get current month's first day
    const today = new Date();
    const monthStartDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

    // Load classes
    const { data: classesData } = await supabase
      .from("classes")
      .select("id, name")
      .order("name");

    if (classesData) {
      setClasses(classesData);
    }

    // Load schedules for current month
    const { data: schedulesData, error } = await supabase
      .from("class_schedules")
      .select(`
        *,
        classes (name),
        bookings:class_bookings (count)
      `)
      .eq("month_start_date", monthStartDate)
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

  const handleCreateClass = async () => {
    if (!newClassName.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la clase es obligatorio",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("classes")
        .insert({
          name: newClassName,
          description: newClassDescription,
          image_url: newClassImageUrl || null,
        });

      if (error) throw error;

      toast({
        title: "Clase creada",
        description: "La clase se ha creado correctamente",
      });

      setIsCreateClassDialogOpen(false);
      setNewClassName("");
      setNewClassDescription("");
      setNewClassImageUrl("");
      loadData();
    } catch (error) {
      console.error("Error creating class:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la clase",
        variant: "destructive",
      });
    }
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

    // Get current month's first day
    const today = new Date();
    const monthStartDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

    const { error } = await supabase
      .from("class_schedules")
      .insert({
        class_id: classId,
        day_of_week: parseInt(dayOfWeek),
        start_time: startTime,
        duration_minutes: parseInt(durationMinutes),
        max_capacity: parseInt(maxCapacity),
        month_start_date: monthStartDate,
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
      setIsCreateDialogOpen(false);
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

  const handleEditSchedule = async () => {
    if (!editingSchedule || !classId || !dayOfWeek || !startTime || !durationMinutes || !maxCapacity) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("class_schedules")
      .update({
        class_id: classId,
        day_of_week: parseInt(dayOfWeek),
        start_time: startTime,
        duration_minutes: parseInt(durationMinutes),
        max_capacity: parseInt(maxCapacity),
      })
      .eq("id", editingSchedule.id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el horario",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Horario actualizado",
        description: "El horario se ha actualizado correctamente",
      });
      setIsEditDialogOpen(false);
      setEditingSchedule(null);
      resetForm();
      loadData();
    }
  };

  const openEditDialog = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setClassId(schedule.class_id);
    setDayOfWeek(schedule.day_of_week.toString());
    setStartTime(schedule.start_time);
    setDurationMinutes(schedule.duration_minutes.toString());
    setMaxCapacity(schedule.max_capacity.toString());
    setIsEditDialogOpen(true);
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

  // Generate time slots from 6:00 to 22:00 (every 30 minutes)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 22 && minute > 0) break;
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeStr);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Function to check if a schedule overlaps with a time slot
  const getScheduleAtTime = (dayNum: number, timeSlot: string) => {
    return schedules.filter(schedule => {
      if (schedule.day_of_week !== dayNum) return false;
      const scheduleTime = schedule.start_time.substring(0, 5);
      const scheduleEndTime = new Date(`2000-01-01T${schedule.start_time}`);
      scheduleEndTime.setMinutes(scheduleEndTime.getMinutes() + schedule.duration_minutes);
      const endTimeStr = `${scheduleEndTime.getHours().toString().padStart(2, '0')}:${scheduleEndTime.getMinutes().toString().padStart(2, '0')}`;
      
      return scheduleTime <= timeSlot && timeSlot < endTimeStr;
    });
  };

  return (
    <div className="container mx-auto py-6 px-3 md:py-8 md:px-4">
      <div className="flex justify-between items-center mb-4 md:mb-6 flex-wrap gap-3 md:gap-4">
        <h1 className="text-2xl md:text-3xl font-bebas tracking-wider">GESTIONAR HORARIOS</h1>
        <div className="flex gap-2">
          <Dialog open={isCreateClassDialogOpen} onOpenChange={setIsCreateClassDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Dumbbell className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Nueva Clase</span>
                <span className="sm:hidden">Clase</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Tipo de Clase</DialogTitle>
                <DialogDescription>
                  Crea un nuevo tipo de clase (ej: CrossTraining, Yoga)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="className">Nombre de la Clase *</Label>
                  <Input
                    id="className"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="CrossTraining, Yoga, Spinning..."
                  />
                </div>
                <div>
                  <Label htmlFor="classDescription">Descripción</Label>
                  <Input
                    id="classDescription"
                    value={newClassDescription}
                    onChange={(e) => setNewClassDescription(e.target.value)}
                    placeholder="Descripción de la clase"
                  />
                </div>
                <div>
                  <Label htmlFor="classImageUrl">URL de Imagen</Label>
                  <Input
                    id="classImageUrl"
                    value={newClassImageUrl}
                    onChange={(e) => setNewClassImageUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateClassDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateClass}>Crear Clase</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <CalendarDays className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Nuevo Horario</span>
                <span className="sm:hidden">Horario</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Horario</DialogTitle>
                <DialogDescription>
                  Añade un nuevo horario para este mes. Se replicará automáticamente cada mes.
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

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Editar Horario</DialogTitle>
                <DialogDescription>
                  Modifica los detalles del horario seleccionado.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-class">Clase</Label>
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger id="edit-class">
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
                  <Label htmlFor="edit-day">Día de la semana</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger id="edit-day">
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
                  <Label htmlFor="edit-time">Hora de inicio</Label>
                  <Input
                    id="edit-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-duration">Duración (minutos)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-capacity">Capacidad máxima</Label>
                  <Input
                    id="edit-capacity"
                    type="number"
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleEditSchedule}>Guardar Cambios</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="visual" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
          <TabsTrigger value="visual">Vista Semanal</TabsTrigger>
          <TabsTrigger value="list">Vista Lista</TabsTrigger>
        </TabsList>

        <TabsContent value="visual">
          {schedules.length === 0 ? (
            <Card className="bg-card/50 backdrop-blur-md border-primary/30">
              <CardContent className="p-8 md:p-12 text-center">
                <CalendarDays className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg text-muted-foreground mb-2">No hay horarios configurados para esta semana</p>
                <p className="text-sm text-muted-foreground">Crea tu primer horario para comenzar</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/80 backdrop-blur-md border-primary/30 overflow-auto">
              <CardContent className="p-3 md:p-6">
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <div className="grid grid-cols-8 gap-px bg-border/50">
                      {/* Header row */}
                      <div className="bg-background p-2 font-semibold text-xs md:text-sm sticky left-0 z-10">
                        Hora
                      </div>
                      {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
                        const weekDateIndex = dayNum === 0 ? 6 : dayNum - 1;
                        const dayDate = weekDates[weekDateIndex];
                        const dateStr = dayDate?.toLocaleDateString('es-ES', { 
                          day: 'numeric', 
                          month: 'short'
                        });
                        return (
                          <div key={dayNum} className="bg-background p-2 text-center">
                            <div className="font-semibold text-xs md:text-sm">{DAYS[dayNum]}</div>
                            <div className="text-xs text-muted-foreground">{dateStr}</div>
                          </div>
                        );
                      })}
                      
                      {/* Time slots */}
                      {timeSlots.map((timeSlot) => (
                        <>
                          <div key={`time-${timeSlot}`} className="bg-background p-2 text-xs text-muted-foreground sticky left-0 z-10 border-r">
                            {timeSlot}
                          </div>
                          {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
                            const schedulesAtTime = getScheduleAtTime(dayNum, timeSlot);
                            return (
                              <div key={`${dayNum}-${timeSlot}`} className="bg-background/50 min-h-[60px] p-1">
                                {schedulesAtTime.map((schedule) => {
                                  const bookingCount = schedule.bookings[0]?.count || 0;
                                  const isFull = bookingCount >= schedule.max_capacity;
                                  const scheduleTime = schedule.start_time.substring(0, 5);
                                  
                                  // Only render the schedule card at its start time
                                  if (scheduleTime !== timeSlot) return null;
                                  
                                  const slots = Math.ceil(schedule.duration_minutes / 30);
                                  
                                  return (
                                    <div
                                      key={schedule.id}
                                      className="group relative bg-primary/10 border border-primary/30 rounded p-1.5 mb-1 hover:bg-primary/20 transition-colors"
                                      style={{ 
                                        minHeight: `${slots * 60 - 8}px`,
                                      }}
                                    >
                                      <div className="flex items-start justify-between gap-1 mb-1">
                                        <p className="font-medium text-xs line-clamp-1">{schedule.classes?.name}</p>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5"
                                            onClick={() => openEditDialog(schedule)}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5"
                                              >
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>¿Eliminar horario?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  Se eliminará el horario y todas las reservas asociadas.
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
                                      </div>
                                      <div className="space-y-0.5 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          <span>{schedule.start_time.substring(0, 5)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Users className="h-3 w-3" />
                                          <span className={isFull ? "text-destructive font-medium" : ""}>
                                            {bookingCount}/{schedule.max_capacity}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="list">
          {schedules.length === 0 ? (
            <Card className="bg-card/50 backdrop-blur-md border-primary/30">
              <CardContent className="p-8 md:p-12 text-center">
                <CalendarDays className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg text-muted-foreground mb-2">No hay horarios configurados para esta semana</p>
                <p className="text-sm text-muted-foreground">Crea tu primer horario para comenzar</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
                const daySchedules = schedulesByDay[dayNum] || [];
                const weekDateIndex = dayNum === 0 ? 6 : dayNum - 1;
                const dayDate = weekDates[weekDateIndex];
                
                if (!dayDate) return null;
                
                const dateStr = dayDate.toLocaleDateString('es-ES', { 
                  day: 'numeric', 
                  month: 'short'
                });

                return (
                  <Card key={dayNum} className="bg-card/80 backdrop-blur-md border-primary/30 hover:border-primary/50 transition-all">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base md:text-lg font-bebas tracking-wide flex items-center justify-between">
                        <span>{DAYS[dayNum]}</span>
                        <Badge variant="outline" className="text-xs font-normal">
                          {dateStr}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {daySchedules.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Sin clases</p>
                      ) : (
                        daySchedules.map((schedule) => {
                          const bookingCount = schedule.bookings[0]?.count || 0;
                          const isFull = bookingCount >= schedule.max_capacity;
                          
                          return (
                            <div
                              key={schedule.id}
                              className="group relative p-3 border rounded-lg bg-accent/30 hover:bg-accent/50 transition-all"
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="font-medium text-sm line-clamp-1">{schedule.classes?.name}</p>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => openEditDialog(schedule)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6"
                                      >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar horario?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Se eliminará el horario y todas las reservas asociadas.
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
                              </div>
                              
                              <div className="flex items-center gap-2 text-xs">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{schedule.start_time.slice(0, 5)}</span>
                                </div>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">{schedule.duration_minutes}min</span>
                              </div>
                              
                              <div className="flex items-center gap-1 mt-2">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <span className={`text-xs font-medium ${isFull ? 'text-destructive' : 'text-muted-foreground'}`}>
                                  {bookingCount}/{schedule.max_capacity}
                                </span>
                                {isFull && (
                                  <Badge variant="destructive" className="text-[10px] ml-auto">
                                    Completa
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Card className="mt-6 bg-card/50 backdrop-blur-md border-primary/30">
        <CardHeader>
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Información sobre horarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Los horarios que crees este mes se duplicarán automáticamente para los próximos meses. 
            No necesitas crear los horarios cada mes, el sistema los replicará por ti.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
