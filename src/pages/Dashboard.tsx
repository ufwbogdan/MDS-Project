import { Link } from "react-router-dom";
import { Upload, History, Swords, HelpCircle, BookOpen, Flame, LogOut } from "lucide-react";
import Navbar from "@/components/Navbar";
import ScrollReveal from "@/components/ScrollReveal";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const quickActions = [
  { to: "/vault", label: "Upload Vault", description: "Drop your study materials", icon: Upload, color: "bg-accent/10 text-accent" },
  { to: "/history", label: "Study History", description: "Review past sessions", icon: History, color: "bg-coffee-light/10 text-coffee-light" },
  { to: "/quests", label: "Quests", description: "Continue your learning path", icon: Swords, color: "bg-primary/10 text-primary" },
  { to: "/quizzes", label: "Quizzes", description: "Test your knowledge", icon: HelpCircle, color: "bg-coffee-medium/10 text-coffee-medium" },
];

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ docs: 0, sessions: 0, quests: 0, quizAvg: "—" });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [docsRes, sessionsRes, questsRes, quizzesRes] = await Promise.all([
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("study_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("quests").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed"),
        supabase.from("quizzes").select("score, total").eq("user_id", user.id).not("score", "is", null),
      ]);
      const quizScores = quizzesRes.data || [];
      const avg = quizScores.length > 0
        ? Math.round((quizScores.reduce((s, q) => s + (q.score || 0), 0) / quizScores.reduce((s, q) => s + (q.total || 1), 0)) * 100) + "%"
        : "—";
      setStats({
        docs: docsRes.count || 0,
        sessions: sessionsRes.count || 0,
        quests: questsRes.count || 0,
        quizAvg: avg,
      });
    };
    load();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const displayName = user?.user_metadata?.full_name || "scholar";

  const statCards = [
    { label: "Documents", value: String(stats.docs), icon: BookOpen },
    { label: "Sessions", value: String(stats.sessions), icon: Flame },
    { label: "Quests Done", value: String(stats.quests), icon: Swords },
    { label: "Quiz Score", value: stats.quizAvg, icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <ScrollReveal>
            <div className="flex items-center justify-between mb-10">
              <div>
                <h1 className="text-3xl font-bold text-foreground" style={{ lineHeight: "1.15" }}>
                  Good morning, {displayName} ☕
                </h1>
                <p className="text-muted-foreground mt-1">What are we tackling today?</p>
              </div>
              <button onClick={handleSignOut} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={80}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {statCards.map(({ label, value, icon: Icon }) => (
                <div key={label} className="coffee-card p-5 text-center">
                  <Icon className="w-5 h-5 mx-auto mb-2 text-accent" />
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={160}>
            <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map(({ to, label, description, icon: Icon, color }) => (
                <Link key={to} to={to} className="coffee-card p-6 flex items-start gap-4 group hover:border-accent/30 transition-all duration-300">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} transition-transform duration-200 group-hover:scale-105`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{label}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
