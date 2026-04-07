import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Sparkles, Volume2 } from "lucide-react";
import deerLogo from "@/assets/deer-logo.png";
import ScrollReveal from "@/components/ScrollReveal";

const features = [
  { icon: BookOpen, title: "Smart Summaries", description: "AI distills your documents into clear, concise bullet points" },
  { icon: Sparkles, title: "Adaptive Quests", description: "Level up through a personalized learning path like a game" },
  { icon: Volume2, title: "Listen & Learn", description: "Hear any summary read aloud in a natural voice" },
];

const Index = () => {
  return (
    <div className="min-h-screen coffee-gradient">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="animate-fade-in-up">
          <img src={deerLogo} alt="Buckle Down" className="w-28 h-28 mx-auto mb-6" />
        </div>
        <h1
          className="text-5xl sm:text-6xl font-bold text-primary tracking-tight animate-fade-in-up animate-delay-100"
          style={{ lineHeight: "1.05" }}
        >
          Buckle Down
        </h1>
        <p className="text-lg text-muted-foreground mt-4 max-w-md animate-fade-in-up animate-delay-200">
          Upload your notes. Let AI brew summaries, quests, and quizzes.
          Study smarter — one cup at a time.
        </p>
        <div className="flex gap-3 mt-8 animate-fade-in-up animate-delay-300">
          <Link to="/signup" className="coffee-btn flex items-center gap-2">
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/login" className="coffee-btn-outline">
            Log In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-center text-foreground mb-12" style={{ lineHeight: "1.15" }}>
              Everything you need to ace it
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description }, i) => (
              <ScrollReveal key={title} delay={80 * (i + 1)}>
                <div className="coffee-card p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
