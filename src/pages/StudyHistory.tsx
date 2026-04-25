import { useState, useEffect } from "react";
import { Clock, FileText, Loader2, ChevronDown, ChevronUp, Share2, Globe, Lock, Copy } from "lucide-react";
import Navbar from "@/components/Navbar";
import ScrollReveal from "@/components/ScrollReveal";
import LessonAudioPlayer from "@/components/LessonAudioPlayer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActivity } from "@/hooks/useActivity";
import { toast } from "@/hooks/use-toast";

const StudyHistory = () => {
  const { user } = useAuth();
  const { logActivity } = useActivity();
  const [sessions, setSessions] = useState<any[]>([]);
  const [classes, setClasses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const list = data || [];
      setSessions(list);
      const classIds = Array.from(new Set(list.map((s: any) => s.class_id).filter(Boolean)));
      if (classIds.length) {
        const { data: cls } = await supabase
          .from("classes")
          .select("id, is_public, share_token")
          .in("id", classIds);
        const map: Record<string, any> = {};
        (cls || []).forEach((c: any) => (map[c.id] = c));
        setClasses(map);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const toggleShare = async (classId: string) => {
    const cur = classes[classId];
    if (!cur) return;
    const next = !cur.is_public;
    const { error } = await supabase
      .from("classes")
      .update({ is_public: next } as any)
      .eq("id", classId);
    if (error) {
      toast({ title: "Failed to update sharing", description: error.message, variant: "destructive" });
      return;
    }
    setClasses((m) => ({ ...m, [classId]: { ...cur, is_public: next } }));
    toast({ title: next ? "Class is now public" : "Class is now private" });
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied", description: url });
  };


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

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
              {sessions.map((item, i) => {
                const isExpanded = expandedId === item.id;
                const summaryText = item.summary || "";

                return (
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

                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="w-full text-left group"
                      >
                        <h3 className="font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {isExpanded ? summaryText : summaryText.substring(0, 300)}
                          {!isExpanded && summaryText.length > 300 ? "..." : ""}
                        </p>
                      </button>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <LessonAudioPlayer
                          text={summaryText}
                          onPlay={() => logActivity("listen_summary", { session_id: item.id })}
                        />

                        {summaryText.length > 300 && (
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4" /> Less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" /> More
                              </>
                            )}
                          </button>
                        )}

                        {item.class_id && classes[item.class_id] && (
                          <>
                            <button
                              onClick={() => toggleShare(item.class_id)}
                              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
                              title={classes[item.class_id].is_public ? "Make private" : "Make public"}
                            >
                              {classes[item.class_id].is_public ? (
                                <><Globe className="w-4 h-4" /> Public</>
                              ) : (
                                <><Lock className="w-4 h-4" /> Private</>
                              )}
                            </button>
                            {classes[item.class_id].is_public && (
                              <button
                                onClick={() => copyLink(classes[item.class_id].share_token)}
                                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-accent hover:bg-secondary transition-all duration-200"
                              >
                                <Share2 className="w-4 h-4" /> Copy link
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudyHistory;
