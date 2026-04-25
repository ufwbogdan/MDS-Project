import { Flame, Snowflake, Package } from "lucide-react";
import { useStreak } from "@/hooks/useStreak";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const XP_PER_CHEST = 5000;

const StreakBar = () => {
  const { user } = useAuth();
  const { streak, loading } = useStreak();
  const [totalXp, setTotalXp] = useState(0);
  const [freezeCount, setFreezeCount] = useState(0);
  const [chestsAwarded, setChestsAwarded] = useState(0);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      // Total XP from completed quests
      const { data: quests } = await supabase
        .from("quests")
        .select("xp")
        .eq("user_id", user.id)
        .eq("status", "completed");
      const xp = (quests || []).reduce((sum: number, q: any) => sum + (q.xp || 0), 0);
      setTotalXp(xp);

      // Freeze count
      const { data: inv } = await supabase
        .from("user_inventory")
        .select("quantity")
        .eq("user_id", user.id)
        .eq("item_type", "streak_freeze")
        .maybeSingle();
      setFreezeCount((inv as any)?.quantity || 0);

      // Check chests awarded (stored as metadata)
      const { data: chestInv } = await supabase
        .from("user_inventory")
        .select("quantity")
        .eq("user_id", user.id)
        .eq("item_type", "chests_awarded_count")
        .maybeSingle();
      const awarded = (chestInv as any)?.quantity || 0;
      setChestsAwarded(awarded);

      // Award new chests if XP threshold crossed
      const deservedChests = Math.floor(xp / XP_PER_CHEST);
      if (deservedChests > awarded) {
        const newFreezes = deservedChests - awarded;
        // Update chests awarded tracker
        if (awarded === 0) {
          await supabase.from("user_inventory").insert({ user_id: user.id, item_type: "chests_awarded_count", quantity: deservedChests } as any);
        } else {
          await supabase.from("user_inventory").update({ quantity: deservedChests } as any).eq("user_id", user.id).eq("item_type", "chests_awarded_count");
        }
        // Add streak freezes
        if ((inv as any)?.quantity !== undefined) {
          await supabase.from("user_inventory").update({ quantity: ((inv as any).quantity || 0) + newFreezes } as any).eq("user_id", user.id).eq("item_type", "streak_freeze");
        } else {
          await supabase.from("user_inventory").insert({ user_id: user.id, item_type: "streak_freeze", quantity: newFreezes } as any);
        }
        setFreezeCount((prev) => prev + newFreezes);
        setChestsAwarded(deservedChests);
        toast({ title: "🎁 Chest Opened!", description: `You earned ${newFreezes} Streak Freeze${newFreezes > 1 ? "s" : ""}! (${xp} XP)` });
      }
    };
    loadData();
  }, [user]);

  if (loading) return null;

  const nextChestXp = (chestsAwarded + 1) * XP_PER_CHEST;
  const progressToChest = Math.min((totalXp / nextChestXp) * 100, 100);

  return (
    <div className="coffee-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Flame className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground tabular-nums">{streak.current_streak}</p>
            <p className="text-xs text-muted-foreground">day streak</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5" title="Streak Freezes">
            <Snowflake className="w-4 h-4 text-primary" />
            <span className="font-medium tabular-nums">{freezeCount}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Next chest at">
            <Package className="w-4 h-4 text-accent" />
            <span className="font-medium tabular-nums">{totalXp}/{nextChestXp} XP</span>
          </div>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Next chest</span>
          <span>{Math.round(progressToChest)}%</span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${progressToChest}%` }}
          />
        </div>
      </div>
      {streak.longest_streak > 0 && (
        <p className="text-xs text-muted-foreground">Best streak: {streak.longest_streak} days</p>
      )}
    </div>
  );
};

export default StreakBar;
