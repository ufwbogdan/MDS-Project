import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Clock, Star, Loader2, Flame, CalendarDays } from "lucide-react";
import Navbar from "@/components/Navbar";
import ScrollReveal from "@/components/ScrollReveal";
import StreakBar from "@/components/StreakBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStreak } from "@/hooks/useStreak";

const DAILY_QUEST_TEMPLATES = [
  { title: "Quiz Whiz", description: "Complete 2 quizzes", quest_action: "complete_quiz", target_count: 2, xp: 100 },
  { title: "Listener", description: "Listen to 3 summaries", quest_action: "listen_summary", target_count: 3, xp: 75 },
  { title: "Upload Hero", description: "Upload 1 document", quest_action: "upload_doc", target_count: 1, xp: 50 },
  { title: "Study Session", description: "Generate study materials", quest_action: "generate_materials", target_count: 1, xp: 80 },
];

const WEEKLY_QUEST_TEMPLATES = [
  { title: "Quiz Master", description: "Complete 10 quizzes", quest_action: "complete_quiz", target_count: 10, xp: 500 },
  { title: "Binge Listener", description: "Listen to 15 summaries", quest_action: "listen_summary", target_count: 15, xp: 400 },
  { title: "Vault Filler", description: "Upload 5 documents", quest_action: "upload_doc", target_count: 5, xp: 300 },
  { title: "Material Generator", description: "Generate 5 study sessions", quest_action: "generate_materials", target_count: 5, xp: 450 },
  { title: "Streak Keeper", description: "Maintain a 5-day streak", quest_action: "maintain_streak", target_count: 5, xp: 600 },
];

const getStartOfDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfDay = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

const getStartOfWeek = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfWeek = () => {
  const start = getStartOfWeek();
  start.setDate(start.getDate() + 6);
  start.setHours(23, 59, 59, 999);
  return start;
};

const Quests = () => {
  const { user } = useAuth();
  const { streak } = useStreak();
  const [quests, setQuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const generateQuests = useCallback(async (period: "daily" | "weekly") => {
    if (!user) return;
    const templates = period === "daily" ? DAILY_QUEST_TEMPLATES : WEEKLY_QUEST_TEMPLATES;
    const expiresAt = period === "daily" ? getEndOfDay() : getEndOfWeek();

    // Pick 3 random quests for daily, 3 for weekly
    const shuffled = [...templates].sort(() => Math.random() - 0.5).slice(0, 3);

    const inserts = shuffled.map((t, i) => ({
      user_id: user.id,
      title: t.title,
      description: t.description,
      quest_period: period,
      quest_action: t.quest_action,
      target_count: t.target_count,
      current_count: 0,
      xp: t.xp,
      status: "current",
      level: i + 1,
      expires_at: expiresAt.toISOString(),
    }));

    await supabase.from("quests").insert(inserts as any);
  }, [user]);

  const loadAndGenerate = useCallback(async () => {
    if (!user) return;
    const startOfDay = getStartOfDay().toISOString();
    const startOfWeek = getStartOfWeek().toISOString();

    // Check existing daily quests for today
    const { data: dailyQuests } = await supabase
      .from("quests")
      .select("*")
      .eq("user_id", user.id)
      .eq("quest_period", "daily")
      .gte("expires_at", startOfDay);

    if (!dailyQuests || dailyQuests.length === 0) {
      await generateQuests("daily");
    }

    // Check existing weekly quests
    const { data: weeklyQuests } = await supabase
      .from("quests")
      .select("*")
      .eq("user_id", user.id)
      .eq("quest_period", "weekly")
      .gte("expires_at", startOfWeek);

    if (!weeklyQuests || weeklyQuests.length === 0) {
      await generateQuests("weekly");
    }

    // Now load all active quests and update progress
    await updateQuestProgress();
    await loadQuests();
  }, [user, generateQuests]);

  const updateQuestProgress = useCallback(async () => {
    if (!user) return;
    const startOfDay = getStartOfDay().toISOString();
    const startOfWeek = getStartOfWeek().toISOString();

    // Get all active quests
    const { data: activeQuests } = await supabase
      .from("quests")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "completed")
      .gte("expires_at", new Date().toISOString());

    if (!activeQuests) return;

    for (const quest of activeQuests) {
      const q = quest as any;
      const since = q.quest_period === "daily" ? startOfDay : startOfWeek;
      let count = 0;

      if (q.quest_action === "maintain_streak") {
        count = streak.current_streak;
      } else {
        const { count: activityCount } = await supabase
          .from("user_activity")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("action", q.quest_action)
          .gte("created_at", since);
        count = activityCount || 0;
      }

      const newStatus = count >= q.target_count ? "completed" : "current";
      if (count !== q.current_count || newStatus !== q.status) {
        await supabase.from("quests").update({
          current_count: count,
          status: newStatus,
        } as any).eq("id", q.id);
      }
    }
  }, [user, streak]);

  const loadQuests = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("quests")
      .select("*")
      .eq("user_id", user.id)
      .gte("expires_at", getStartOfWeek().toISOString())
      .order("quest_period", { ascending: true })
      .order("level", { ascending: true });
    setQuests(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadAndGenerate();
  }, [loadAndGenerate]);

  const dailyQuests = quests.filter((q: any) => q.quest_period === "daily");
  const weeklyQuests = quests.filter((q: any) => q.quest_period === "weekly");
  const totalXp = quests.filter((q: any) => q.status === "completed").reduce((sum: number, q: any) => sum + (q.xp || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <ScrollReveal>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground" style={{ lineHeight: "1.15" }}>Quests</h1>
                <p className="text-muted-foreground mt-1">Complete daily & weekly challenges</p>
              </div>
              <div className="coffee-card px-4 py-2 flex items-center gap-2">
                <Star className="w-4 h-4 text-accent" />
                <span className="font-bold text-foreground tabular-nums">{totalXp} XP</span>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={60}>
            <div className="mb-8">
              <StreakBar />
            </div>
          </ScrollReveal>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <QuestSection
                title="Daily Quests"
                icon={<Flame className="w-5 h-5 text-accent" />}
                quests={dailyQuests}
                emptyText="No daily quests — check back tomorrow!"
              />
              <QuestSection
                title="Weekly Quests"
                icon={<CalendarDays className="w-5 h-5 text-primary" />}
                quests={weeklyQuests}
                emptyText="No weekly quests — check back next week!"
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

const QuestSection = ({ title, icon, quests, emptyText }: { title: string; icon: React.ReactNode; quests: any[]; emptyText: string }) => (
  <ScrollReveal delay={100}>
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {quests.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {quests.map((quest: any) => {
            const isCompleted = quest.status === "completed";
            const progress = Math.min((quest.current_count / quest.target_count) * 100, 100);
            return (
              <div
                key={quest.id}
                className={`coffee-card p-5 transition-all duration-200 ${
                  isCompleted ? "ring-2 ring-accent/30 border-accent/20" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-foreground">{quest.title}</h3>
                      {isCompleted && <CheckCircle2 className="w-4 h-4 text-accent" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{quest.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-accent">
                    <Star className="w-3 h-3" />
                    {quest.xp} XP
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{quest.current_count}/{quest.target_count}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {isCompleted ? "Done!" : quest.quest_period === "daily" ? "Today" : "This week"}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isCompleted ? "bg-accent" : "bg-primary"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </ScrollReveal>
);

export default Quests;
