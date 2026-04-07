import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, RotateCcw, ChevronRight, Loader2, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import ScrollReveal from "@/components/ScrollReveal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
}

const Quizzes = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("quizzes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setQuizzes(data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const startQuiz = (quiz: any) => {
    const qs = (quiz.questions as Question[]) || [];
    setActiveQuiz(quiz);
    setQuestions(qs);
    setCurrentQ(0);
    setSelectedAnswer(null);
    setAnswers(new Array(qs.length).fill(null));
    setShowResults(false);
  };

  const handleSelect = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    const newAnswers = [...answers];
    newAnswers[currentQ] = index;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelectedAnswer(null);
    } else {
      setShowResults(true);
      // Save score
      const score = answers.filter((a, i) => a === questions[i]?.correctIndex).length;
      supabase.from("quizzes").update({ score, completed_at: new Date().toISOString() }).eq("id", activeQuiz.id).then(() => {});
    }
  };

  const handleRestart = () => {
    setCurrentQ(0);
    setSelectedAnswer(null);
    setAnswers(new Array(questions.length).fill(null));
    setShowResults(false);
  };

  // Quiz list view
  if (!activeQuiz) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-lg">
            <ScrollReveal>
              <h1 className="text-2xl font-bold text-foreground mb-2" style={{ lineHeight: "1.15" }}>Quizzes</h1>
              <p className="text-muted-foreground mb-6">Test your knowledge with AI-generated quizzes.</p>
            </ScrollReveal>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No quizzes yet</p>
                <p className="text-sm mt-1">Generate study materials from your documents first</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quizzes.map((quiz, i) => (
                  <ScrollReveal key={quiz.id} delay={80 * (i + 1)}>
                    <div className="coffee-card p-5">
                      <h3 className="font-semibold text-foreground mb-1">{quiz.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {(quiz.questions as any[])?.length || 0} questions
                        {quiz.score !== null && ` · Score: ${quiz.score}/${quiz.total}`}
                      </p>
                      <button onClick={() => startQuiz(quiz)} className="coffee-btn text-sm">
                        {quiz.score !== null ? "Retake Quiz" : "Start Quiz"}
                      </button>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  const question = questions[currentQ];
  const isAnswered = selectedAnswer !== null;
  const isCorrect = selectedAnswer === question?.correctIndex;
  const score = answers.filter((a, i) => a === questions[i]?.correctIndex).length;

  if (showResults) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-lg">
            <ScrollReveal>
              <div className="coffee-card p-10 text-center">
                <div className="text-5xl font-bold text-primary mb-2 tabular-nums">{score}/{questions.length}</div>
                <p className="text-muted-foreground mb-1">
                  {score === questions.length ? "Perfect score! 🎉" : score >= questions.length / 2 ? "Great work! ☕" : "Keep studying! 💪"}
                </p>
                <div className="flex gap-2 justify-center mt-6">
                  <button onClick={handleRestart} className="coffee-btn-outline flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Try Again
                  </button>
                  <button onClick={() => setActiveQuiz(null)} className="coffee-btn">Back to Quizzes</button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-lg">
          <ScrollReveal>
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-foreground" style={{ lineHeight: "1.15" }}>Pop Quiz</h1>
                <span className="text-sm text-muted-foreground tabular-nums">{currentQ + 1} / {questions.length}</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${((currentQ + (isAnswered ? 1 : 0)) / questions.length) * 100}%` }} />
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={80}>
            <div className="coffee-card p-6 mb-6">
              <p className="text-lg font-medium text-foreground leading-relaxed">{question?.question}</p>
            </div>
          </ScrollReveal>

          <div className="space-y-3">
            {question?.options.map((option, index) => {
              let optionStyle = "coffee-card p-4 cursor-pointer hover:border-accent/30";
              if (isAnswered) {
                if (index === question.correctIndex) optionStyle = "coffee-card p-4 ring-2 ring-green-500/40 border-green-500/20 bg-green-50";
                else if (index === selectedAnswer && !isCorrect) optionStyle = "coffee-card p-4 ring-2 ring-destructive/40 border-destructive/20 bg-red-50";
                else optionStyle = "coffee-card p-4 opacity-50";
              }
              return (
                <button key={index} onClick={() => handleSelect(index)} className={`w-full text-left transition-all duration-200 ${optionStyle}`} disabled={isAnswered}>
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-foreground flex-shrink-0">{String.fromCharCode(65 + index)}</span>
                    <span className="text-foreground">{option}</span>
                    {isAnswered && index === question.correctIndex && <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto flex-shrink-0" />}
                    {isAnswered && index === selectedAnswer && !isCorrect && index !== question.correctIndex && <XCircle className="w-5 h-5 text-destructive ml-auto flex-shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>

          {isAnswered && (
            <button onClick={handleNext} className="coffee-btn w-full mt-6 flex items-center justify-center gap-2">
              {currentQ < questions.length - 1 ? "Next Question" : "See Results"}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default Quizzes;
