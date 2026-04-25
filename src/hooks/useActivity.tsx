import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useActivity = () => {
  const { user } = useAuth();

  const logActivity = useCallback(
    async (action: string, metadata: Record<string, any> = {}) => {
      if (!user) return;
      await supabase.from("user_activity").insert({
        user_id: user.id,
        action,
        metadata,
      } as any);
    },
    [user]
  );

  return { logActivity };
};
