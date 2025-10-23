import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useBlockedStatus() {
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBlockedStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("blocked")
        .eq("id", user.id)
        .single();

      setIsBlocked(profile?.blocked || false);
      setLoading(false);
    };

    checkBlockedStatus();
  }, []);

  return { isBlocked, loading };
}
