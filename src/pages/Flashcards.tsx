import { useEffect, useMemo, useState } from "react";
import { Layers, ChevronLeft, ChevronRight, RotateCw, Check, X, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import ScrollReveal from "@/components/ScrollReveal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActivity } from "@/hooks/useActivity";

interface ClassRow {
  id: string;
  title: string;
  flashcard_count: number;
}

interface Card {
  id: string;
  class_id: string;
  front: string;
  back: string;
  ease: number;
  interval_days: number;
  due_at: string;
}

const Flashcards = () => {
  const { user } = useAuth();
  const { logActivity } = useActivity();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [activeClass, setActiveClass] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load classes that have flashcards
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: cls } = await supabase
        .from("classes")
        .select("id, title")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!cls?.length) { setClasses([]); setLoading(false); return; }

      const { data: counts } = await supabase
        .from("flashcards")
        .select("class_id")
        .in("class_id", cls.map((c) => c.id));

      const countMap = new Map<string, number>();
      counts?.forEach((c: any) => countMap.set(c.class_id, (countMap.get(c.class_id) || 0) + 1));

      setClasses(cls.map((c) => ({ id: c.id, title: c.title, flashcard_count: countMap.get(c.id) || 0 })));
      setLoading(false);
    };
    load();
  }, [user]);

  const openClass = async (classId: string) => {
    setActiveClass(classId);
    setIdx(0);
    setFlipped(false);
    const { data } = await supabase
      .from("flashcards")
      .select("*")
      .eq("class_id", classId)
      .order("due_at", { ascending: true });
    setCards((data as any) || []);
  };

  const current = cards[idx];

  const advance = () => {
    setFlipped(false);
    setIdx((i) => (i + 1) % Math.max(cards.length, 1));
  };

  const reviewCard = async (knew: boolean) => {
    if (!current) return;
    // Lightweight SM-2-style scheduling
    let { ease, interval_days } = current;
    if (knew) {
      ease = Math.min(2.8, ease + 0.05);
      interval_days = interval_days === 0 ? 1 : Math.round(interval_days * ease);
    } else {
      ease = Math.max(1.3, ease - 0.2);
      interval_days = 1;
    }
    const due = new Date();
    due.setDate(due.getDate() + interval_days);

    await supabase
      .from("flashcards")
      .update({
        ease,
        interval_days,
        due_at: due.toISOString(),
        last_reviewed_at: new Date().toISOString(),
      })
      .eq("id", current.id);

    logActivity("review_flashcard", { card_id: current.id, knew });
    advance();
  };

  const progress = useMemo(
    () => (cards.length ? `${idx + 1} / ${cards.length}` : "0 / 0"),
    [idx, cards.length]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <ScrollReveal>
            <h1 className="text-3xl font-bold text-foreground mb-2" style={{ lineHeight: "1.15" }}>
              Flashcards
            </h1>
            <p className="text-muted-foreground mb-8">Flip, review, and lock concepts into memory.</p>
          </ScrollReveal>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !activeClass ? (
            classes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No flashcard decks yet</p>
                <p className="text-sm mt-1">Generate study materials from the Upload Vault to create some.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {classes.map((c, i) => (
                  <ScrollReveal key={c.id} delay={60 * i}>
                    <button
                      onClick={() => openClass(c.id)}
                      disabled={c.flashcard_count === 0}
                      className="coffee-card p-5 w-full text-left flex items-center justify-between disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <Layers className="w-5 h-5 text-accent" />
                        <div>
                          <p className="font-semibold text-foreground">{c.title}</p>
                          <p className="text-xs text-muted-foreground">{c.flashcard_count} cards</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </ScrollReveal>
                ))}
              </div>
            )
          ) : (
            <div>
              <button
                onClick={() => { setActiveClass(null); setCards([]); }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Back to decks
              </button>

              {cards.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="font-medium">No cards in this deck</p>
                </div>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground text-center mb-3">{progress}</div>
                  <button
                    onClick={() => setFlipped((f) => !f)}
                    className="coffee-card w-full min-h-[260px] p-8 flex items-center justify-center text-center cursor-pointer hover:border-accent/40 transition"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                        {flipped ? "Answer" : "Question"}
                      </p>
                      <p className="text-xl font-medium text-foreground whitespace-pre-line">
                        {flipped ? current.back : current.front}
                      </p>
                      <p className="text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1">
                        <RotateCw className="w-3 h-3" /> Tap to flip
                      </p>
                    </div>
                  </button>

                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => reviewCard(false)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-foreground hover:bg-secondary transition active:scale-[0.98]"
                    >
                      <X className="w-4 h-4" /> Review again
                    </button>
                    <button
                      onClick={() => reviewCard(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-accent-foreground hover:opacity-90 transition active:scale-[0.98]"
                    >
                      <Check className="w-4 h-4" /> Know it
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Flashcards;
