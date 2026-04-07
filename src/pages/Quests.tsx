import { useState, useEffect } from "react";
import { Lock, CheckCircle2, PlayCircle, Star, Loader2, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import ScrollReveal from "@/components/ScrollReveal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const statusConfig = {
  completed: { icon: CheckCircle2, ring: "ring-2 ring-accent/30 border-accent/20", iconColor: "text-accent", badge: "bg-accent/10 text-accent" },
  current: { icon: PlayCircle, ring: "ring-2 ring-primary/40 border-primary/20 shadow-md", iconColor: "text-primary", badge: "bg-primary/10 text-primary" },
  locked: { icon: Lock, ring: "opacity-50", iconColor: "text-muted-foreground", badge: "bg-muted text-muted-foreground" },
};

const Quests = () => {
  const { user } = useAuth();
  const [quests, setQuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("quests")
        .select("*")
        .eq("user_id", user.id)
        .order("level", { ascending: true });
      setQuests(data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const completeQuest = async (quest: any) => {
    // Mark current as completed
    await supabase.from("quests").update({ status: "completed" }).eq("id", quest.id);
    // Unlock next quest in same session
    const nextQuest = quests.find((q) => q.session_id === quest.session_id && q.level === quest.level + 1);
    if (nextQuest) {
      await supabase.from("quests").update({ status: "current" }).eq("id", nextQuest.id);
    }
    toast({ title: `+${quest.xp} XP! 🎉`, description: `Completed: ${quest.title}` });
    // Reload
    const { data } = await supabase.from("quests").select("*").eq("user_id", user!.id).order("level", { ascending: true });
    setQuests(data || []);
  };

  const totalXp = quests.filter((q) => q.status === "completed").reduce((sum, q) => sum + q.xp, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <ScrollReveal>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground" style={{ lineHeight: "1.15" }}>Quests</h1>
                <p className="text-muted-foreground mt-1">Your progressive learning path</p>
              </div>
              <div className="coffee-card px-4 py-2 flex items-center gap-2">
                <Star className="w-4 h-4 text-accent" />
                <span className="font-bold text-foreground tabular-nums">{totalXp} XP</span>
              </div>
            </div>
          </ScrollReveal>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : quests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No quests yet</p>
              <p className="text-sm mt-1">Generate study materials from your documents first</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-4">
                {quests.map((quest, i) => {
                  const config = statusConfig[quest.status as keyof typeof statusConfig] || statusConfig.locked;
                  const Icon = config.icon;
                  return (
                    <ScrollReveal key={quest.id} delay={80 * (i + 1)}>
                      <div className={`coffee-card p-5 ml-14 relative ${config.ring} transition-all duration-200`}>
                        <div className="absolute -left-[3.75rem] top-5 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center">
                          <span className="text-xs font-bold text-muted-foreground">{quest.level}</span>
                        </div>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">{quest.title}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badge}`}>
                                {quest.status === "completed" ? "Done" : quest.status === "current" ? "In Progress" : "Locked"}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{quest.description}</p>
                            {quest.content && quest.status === "current" && (
                              <p className="text-sm text-foreground mt-2 whitespace-pre-line">{quest.content}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <Star className="w-3 h-3" /> {quest.xp} XP
                            </p>
                          </div>
                          <Icon className={`w-6 h-6 flex-shrink-0 ${config.iconColor}`} />
                        </div>
                        {quest.status === "current" && (
                          <button onClick={() => completeQuest(quest)} className="coffee-btn text-sm mt-4 w-full">
                            Complete Quest
                          </button>
                        )}
                      </div>
                    </ScrollReveal>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Quests;
