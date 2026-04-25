import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, FileText, Layers, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import LessonAudioPlayer from "@/components/LessonAudioPlayer";
import deerLogo from "@/assets/deer-logo.png";

const SharedClass = () => {
  const { token } = useParams();
  const [cls, setCls] = useState<any | null>(null);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      const { data } = await supabase
        .from("classes")
        .select("*")
        .eq("share_token", token)
        .eq("is_public", true)
        .maybeSingle();
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCls(data);
      const { data: cards } = await supabase
        .from("flashcards")
        .select("front, back, position")
        .eq("class_id", (data as any).id)
        .order("position", { ascending: true });
      setFlashcards(cards || []);
      setLoading(false);
    };
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen coffee-gradient flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen coffee-gradient flex items-center justify-center px-4">
        <div className="coffee-card p-10 text-center max-w-md">
          <Lock className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground mb-2">This class isn't public</h1>
          <p className="text-sm text-muted-foreground mb-4">
            It may have been unshared or the link is invalid.
          </p>
          <Link to="/" className="coffee-btn inline-block">Back to Buckle Down</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={deerLogo} alt="Buckle Down" className="w-8 h-8" />
            <span className="text-lg font-bold text-primary">Buckle Down</span>
          </Link>
          <span className="text-xs text-muted-foreground">Shared lesson</span>
        </div>
      </header>

      <main className="pt-10 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground mb-2" style={{ lineHeight: "1.15" }}>
            {cls.title}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Shared on {new Date(cls.created_at).toLocaleDateString()}
          </p>

          <div className="coffee-card p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold text-accent uppercase tracking-wide">Summary</h2>
            </div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              {cls.summary}
            </p>
            <div className="mt-4">
              <LessonAudioPlayer text={cls.summary || ""} />
            </div>
          </div>

          {flashcards.length > 0 && (
            <div className="coffee-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-semibold text-accent uppercase tracking-wide">
                  Flashcards ({flashcards.length})
                </h2>
              </div>
              <div className="space-y-3">
                {flashcards.map((c, i) => (
                  <details key={i} className="rounded-xl border border-border p-4 bg-background">
                    <summary className="cursor-pointer font-medium text-foreground">
                      {c.front}
                    </summary>
                    <p className="mt-2 text-sm text-muted-foreground">{c.back}</p>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SharedClass;
