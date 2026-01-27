import { useEffect, useState } from "react";
import { useUserRole } from "./useUserRole";

export function useMonthlyClassesRemaining(userId: string | null) {
  const [classesRemaining, setClassesRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { role, isAdmin } = useUserRole();

  useEffect(() => {
    if (!userId || !role) {
      setLoading(false);
      return;
    }

    // Admins, full members, and basica_clases all have unlimited classes
    if (isAdmin || role === "full" || role === "basica_clases") {
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

    setLoading(false);
  }, [userId, role, isAdmin]);

  return {
    classesRemaining,
    hasClassesRemaining: classesRemaining !== null && classesRemaining > 0,
    loading
  };
}
