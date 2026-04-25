import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

export const useStreak = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakData>({ current_streak: 0, longest_streak: 0, last_active_date: null });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setStreak(data as any);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const recordDailyActivity = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("user_streaks").insert({
        user_id: user.id,
        current_streak: 1,
        longest_streak: 1,
        last_active_date: today,
      } as any);
      setStreak({ current_streak: 1, longest_streak: 1, last_active_date: today });
      return;
    }

    const lastDate = (existing as any).last_active_date;
    if (lastDate === today) return; // Already active today

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    let newStreak: number;
    if (lastDate === yesterdayStr) {
      newStreak = ((existing as any).current_streak || 0) + 1;
    } else {
      // Check for streak freeze
      const { data: freezeItem } = await supabase
        .from("user_inventory")
        .select("*")
        .eq("user_id", user.id)
        .eq("item_type", "streak_freeze")
        .maybeSingle();

      if (freezeItem && (freezeItem as any).quantity > 0) {
        // Use a freeze
        const newQty = (freezeItem as any).quantity - 1;
        if (newQty <= 0) {
          await supabase.from("user_inventory").delete().eq("id", (freezeItem as any).id);
        } else {
          await supabase.from("user_inventory").update({ quantity: newQty } as any).eq("id", (freezeItem as any).id);
        }
        newStreak = ((existing as any).current_streak || 0) + 1;
      } else {
        newStreak = 1; // Streak broken
      }
    }

    const newLongest = Math.max(newStreak, (existing as any).longest_streak || 0);
    await supabase
      .from("user_streaks")
      .update({ current_streak: newStreak, longest_streak: newLongest, last_active_date: today, updated_at: new Date().toISOString() } as any)
      .eq("user_id", user.id);

    setStreak({ current_streak: newStreak, longest_streak: newLongest, last_active_date: today });
  }, [user]);

  return { streak, loading, recordDailyActivity, reload: load };
};
