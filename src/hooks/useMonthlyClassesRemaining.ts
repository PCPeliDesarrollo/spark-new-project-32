import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";
import { startOfMonth, endOfMonth, format } from "date-fns";

export function useMonthlyClassesRemaining(userId: string | null) {
  const [classesRemaining, setClassesRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { role, isAdmin } = useUserRole();

  useEffect(() => {
    if (!userId || !role) {
      setLoading(false);
      return;
    }

    loadClassesRemaining();

    // Subscribe to booking changes to update in real-time
    const channel = supabase
      .channel('user-bookings-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_bookings',
          filter: `user_id=eq.${userId}`
        },
        () => {
          loadClassesRemaining();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, role]);

  const loadClassesRemaining = async () => {
    if (!userId || !role) return;

    // Admins have unlimited classes
    if (isAdmin) {
      setClassesRemaining(999);
      setLoading(false);
      return;
    }

    // Users with "basica" role cannot book classes
    if (role === "basica") {
      setClassesRemaining(0);
      setLoading(false);
      return;
    }

    // For "basica_clases" and "full" roles: 12 classes per month
    if (role === "basica_clases" || role === "full") {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      const { data, error } = await supabase
        .from("class_bookings")
        .select("id", { count: "exact", head: false })
        .eq("user_id", userId)
        .eq("status", "confirmed")
        .gte("class_date", format(monthStart, 'yyyy-MM-dd'))
        .lte("class_date", format(monthEnd, 'yyyy-MM-dd'));

      if (!error) {
        const confirmedCount = data?.length || 0;
        setClassesRemaining(12 - confirmedCount);
      }
    }

    setLoading(false);
  };

  return {
    classesRemaining,
    hasClassesRemaining: classesRemaining !== null && classesRemaining > 0,
    loading
  };
}
