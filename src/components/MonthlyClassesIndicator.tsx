import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface ClassBooking {
  id: string;
  status: string;
  class_date: string;
  schedule_id: string;
  class_schedules: {
    start_time: string;
  };
}

export function MonthlyClassesIndicator() {
  const { role, loading: roleLoading } = useUserRole();
  const [bookings, setBookings] = useState<ClassBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && (role === "basica_clases" || role === "full")) {
      loadBookings();

      // Suscribirse a cambios en tiempo real en las reservas
      const channel = supabase
        .channel('bookings-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'class_bookings'
          },
          (payload) => {
            console.log('Cambio detectado en reservas:', payload);
            loadBookings(); // Recargar cuando haya cambios
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setLoading(false);
    }
  }, [role, roleLoading]);

  const loadBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current month start and end in local timezone
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      
      // First day of current month at 00:00:00
      const monthStart = new Date(year, month, 1);
      // Last day of current month at 23:59:59
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
      
      // Format dates as YYYY-MM-DD for database query
      const formatDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };
      
      const { data, error } = await supabase
        .from("class_bookings")
        .select(`
          id,
          status,
          class_date,
          schedule_id,
          class_schedules (
            start_time
          )
        `)
        .eq("user_id", user.id)
        .gte("class_date", formatDate(monthStart))
        .lte("class_date", formatDate(monthEnd))
        .eq("status", "confirmed")
        .order("class_date", { ascending: true });

      if (error) throw error;
      
      console.log("Bookings cargadas:", data);
      setBookings(data || []);
    } catch (error) {
      console.error("Error loading bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Only show for users with basica_clases or full subscription
  if (role !== "basica_clases" && role !== "full") return null;

  const getClassStatus = (booking: ClassBooking): "used" | "booked" | "available" => {
    const schedule = booking.class_schedules;
    if (!schedule) return "available";

    // Create date object from the class date (YYYY-MM-DD format)
    const [year, month, day] = booking.class_date.split('-').map(Number);
    const [hours, minutes] = schedule.start_time.split(':').map(Number);
    
    // Create the class date/time in local timezone
    const classDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const now = new Date();
    
    // If class date/time has passed, it's used (red)
    if (classDateTime < now) {
      return "used";
    }
    
    // If class date/time is in the future, it's booked (yellow)
    return "booked";
  };

  const usedClasses = bookings.filter(b => getClassStatus(b) === "used").length;
  const bookedClasses = bookings.filter(b => getClassStatus(b) === "booked").length;
  const availableClasses = 12 - usedClasses - bookedClasses;

  const boxes = [];
  
  // Red boxes (used)
  for (let i = 0; i < usedClasses; i++) {
    boxes.push({ key: `used-${i}`, color: "bg-red-500" });
  }
  
  // Yellow boxes (booked)
  for (let i = 0; i < bookedClasses; i++) {
    boxes.push({ key: `booked-${i}`, color: "bg-yellow-500" });
  }
  
  // Green boxes (available)
  for (let i = 0; i < availableClasses; i++) {
    boxes.push({ key: `available-${i}`, color: "bg-green-500" });
  }

  return (
    <Card className="mb-3 md:mb-4 bg-card/80 backdrop-blur-md border-primary/30">
      <CardHeader className="p-3 md:p-4">
        <CardTitle className="text-base md:text-lg font-bebas tracking-wide text-center sm:text-left">
          Clases Mensuales - {availableClasses} disponibles de 12
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 md:p-4 pt-0">
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 sm:gap-1.5">
          {boxes.map((box) => (
            <div
              key={box.key}
              className={`aspect-square rounded ${box.color} transition-all duration-200 hover:scale-105 shadow-sm`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3 mt-3 text-[10px] sm:text-xs justify-center sm:justify-start">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-green-500" />
            <span>Disponibles</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-yellow-500" />
            <span>Reservadas</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-red-500" />
            <span>Usadas</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
