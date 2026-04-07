import { useState, useEffect } from "react";
import { Clock, FileText, Volume2, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import ScrollReveal from "@/components/ScrollReveal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const speak = (text: string) => {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
};

const StudyHistory = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setSessions(data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <ScrollReveal>
            <h1 className="text-3xl font-bold text-foreground mb-2" style={{ lineHeight: "1.15" }}>
              Study History
            </h1>
            <p className="text-muted-foreground mb-8">Your recent study sessions and generated materials.</p>
          </ScrollReveal>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No study sessions yet</p>
              <p className="text-sm mt-1">Upload documents and generate study materials to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((item, i) => (
                <ScrollReveal key={item.id} delay={80 * (i + 1)}>
                  <div className="coffee-card p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-accent" />
                        <span className="text-xs font-medium text-accent uppercase tracking-wide">
                          {item.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {item.summary?.substring(0, 300)}
                      {item.summary?.length > 300 ? "..." : ""}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => speak(item.summary || "")}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 active:scale-[0.97]"
                      >
                        <Volume2 className="w-4 h-4" />
                        Listen
                      </button>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudyHistory;
