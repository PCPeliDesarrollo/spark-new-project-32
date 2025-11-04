import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface ClassBooking {
  id: string;
  status: string;
  created_at: string;
  schedule_id: string;
  class_schedules: {
    month_start_date: string;
    start_time: string;
    day_of_week: number;
  };
}

export function MonthlyClassesIndicator() {
  const { role, loading: roleLoading } = useUserRole();
  const [bookings, setBookings] = useState<ClassBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && (role === "basica_clases" || role === "full")) {
      loadBookings();
    } else {
      setLoading(false);
    }
  }, [role, roleLoading]);

  const loadBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current month start
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const { data, error } = await supabase
        .from("class_bookings")
        .select(`
          id,
          status,
          created_at,
          schedule_id,
          class_schedules (
            month_start_date,
            start_time,
            day_of_week
          )
        `)
        .eq("user_id", user.id)
        .gte("created_at", monthStart.toISOString())
        .eq("status", "confirmed")
        .order("created_at", { ascending: true });

      if (error) throw error;
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

    // Calculate the actual date and time of the class
    const classDate = new Date(schedule.month_start_date);
    classDate.setDate(classDate.getDate() + schedule.day_of_week);
    
    const [hours, minutes] = schedule.start_time.split(":");
    classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const now = new Date();
    
    // If class date/time has passed, it's used (red)
    if (classDate < now) {
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
