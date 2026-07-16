import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import pantheraIcon from "@/assets/pantera-menu-icon.png";

interface ClassData {
  id: string;
  name: string;
  description: string;
  image_url: string;
}

interface ScheduleData {
  id: string;
  class_id: string;
  day_of_week: number; // 0=Domingo ... 6=Sábado
  start_time: string;  // "HH:MM:SS"
}

const DAY_LABELS = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];
const DAY_LABELS_SHORT = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function getWeekRangeLabel(now: Date = new Date()) {
  const day = now.getDay(); // 0=Dom..6=Sab
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const sameMonth = monday.getMonth() === sunday.getMonth();
  const sameYear = monday.getFullYear() === sunday.getFullYear();

  if (sameMonth && sameYear) {
    return `Semana del ${monday.getDate()} al ${sunday.getDate()} de ${MONTHS[monday.getMonth()]}`;
  }
  if (sameYear) {
    return `Semana del ${monday.getDate()} de ${MONTHS[monday.getMonth()]} al ${sunday.getDate()} de ${MONTHS[sunday.getMonth()]}`;
  }
  return `Semana del ${monday.getDate()} de ${MONTHS[monday.getMonth()]} ${monday.getFullYear()} al ${sunday.getDate()} de ${MONTHS[sunday.getMonth()]} ${sunday.getFullYear()}`;
}

export default function Classes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekLabel, setWeekLabel] = useState<string>(() => getWeekRangeLabel());

  useEffect(() => {
    const update = () => setWeekLabel(getWeekRangeLabel());
    update();
    const interval = setInterval(update, 60 * 60 * 1000); // cada hora
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("classes-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "classes" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "class_schedules" }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const [classesRes, schedulesRes] = await Promise.all([
        supabase.from("classes").select("*").order("name"),
        supabase
          .from("class_schedules")
          .select("id, class_id, day_of_week, start_time")
          .order("start_time"),
      ]);

      if (classesRes.error) throw classesRes.error;
      if (schedulesRes.error) throw schedulesRes.error;

      setClasses(classesRes.data || []);
      setSchedules((schedulesRes.data || []) as ScheduleData[]);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const daysWithClasses = DAY_ORDER.filter((d) => schedules.some((s) => s.day_of_week === d));
  const timeSlots = Array.from(
    new Set(schedules.map((s) => s.start_time.substring(0, 5)))
  ).sort();

  const classById = new Map(classes.map((c) => [c.id, c]));

  const getCellClass = (day: number, time: string) => {
    const slot = schedules.find(
      (s) => s.day_of_week === day && s.start_time.substring(0, 5) === time
    );
    if (!slot) return null;
    return classById.get(slot.class_id) || null;
  };

  return (
    <div className="container py-2 sm:py-4 md:py-8 px-2 sm:px-4">
      <h1 className="font-bebas text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl tracking-wider mb-3 sm:mb-4 md:mb-6 text-primary drop-shadow-[0_0_25px_hsl(var(--primary)/0.6)] text-center">
        HORARIOS GIMNASIO
      </h1>

      <p className="text-center font-bebas tracking-wider text-primary/90 text-sm sm:text-base md:text-xl lg:text-2xl mb-3 sm:mb-4 md:mb-6 capitalize">
        {weekLabel}
      </p>

      {timeSlots.length === 0 || daysWithClasses.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No hay clases programadas por el momento.
        </div>
      ) : (
        <>
          <div
            className="grid gap-1.5 sm:gap-2 mb-1.5 sm:mb-2"
            style={{ gridTemplateColumns: `repeat(${daysWithClasses.length}, minmax(0, 1fr))` }}
          >
            {daysWithClasses.map((d) => (
              <div
                key={d}
                className="bg-secondary text-primary border border-primary/40 font-bebas tracking-normal sm:tracking-wide text-center py-2 sm:py-3 px-1 rounded-md text-xs sm:text-sm md:text-base lg:text-lg shadow-[0_0_10px_hsl(var(--primary)/0.15)] leading-tight"
              >
                <span className="sm:hidden">{DAY_LABELS_SHORT[d]}</span>
                <span className="hidden sm:inline">{DAY_LABELS[d]}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 sm:gap-2">
            {timeSlots.map((time) => (
              <div
                key={time}
                className="grid gap-1.5 sm:gap-2"
                style={{ gridTemplateColumns: `repeat(${daysWithClasses.length}, minmax(0, 1fr))` }}
              >
                {daysWithClasses.map((d) => {
                  const cls = getCellClass(d, time);
                  if (cls) {
                    return (
                      <button
                        key={`${d}-${time}`}
                        onClick={() => navigate(`/classes/${cls.id}`)}
                        className="bg-primary/90 hover:bg-primary text-primary-foreground rounded-md px-1 py-2 sm:py-3 md:py-4 font-bebas tracking-normal sm:tracking-wide text-[11px] sm:text-sm md:text-lg text-center transition-all hover:scale-[1.03] hover:shadow-[0_0_15px_hsl(var(--primary)/0.6)] active:scale-95 min-h-[44px] flex flex-col items-center justify-center leading-tight gap-0.5"
                        aria-label={`Ver horarios de ${cls.name}`}
                      >
                        <span className="line-clamp-2 break-words">{cls.name.toUpperCase()}</span>
                        <span className="text-[9px] sm:text-xs md:text-sm font-inter font-semibold opacity-90 tracking-normal">
                          {time}
                        </span>
                      </button>
                    );
                  }
                  return (
                    <div
                      key={`${d}-${time}`}
                      className="bg-primary/30 rounded-md px-1 py-3 sm:py-5 md:py-6 flex items-center justify-center min-h-[44px]"
                      aria-label="Entrenamiento libre"
                    >
                      <img
                        src={pantheraIcon}
                        alt=""
                        className="h-5 w-5 sm:h-7 sm:w-7 md:h-9 md:w-9 object-contain opacity-90"
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

        </>
      )}
    </div>
  );
}