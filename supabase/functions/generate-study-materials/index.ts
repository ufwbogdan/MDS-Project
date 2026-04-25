import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { documentIds } = await req.json();
    if (!documentIds?.length) throw new Error("No documents selected");

    // Fetch documents
    const { data: docs, error: docsError } = await supabase
      .from("documents")
      .select("*")
      .in("id", documentIds);
    if (docsError) throw docsError;
    if (!docs?.length) throw new Error("No documents found");

    const combinedText = docs
      .map((d: any) => d.extracted_text || `[Document: ${d.name}]`)
      .join("\n\n---\n\n");

    if (!combinedText.trim() || combinedText.length < 20) {
      throw new Error("Not enough text content in selected documents. Please upload documents with text content.");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const docNames = docs.map((d: any) => d.name).join(", ");

    // Generate all materials in one call
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert study material generator. Based on the provided document content, generate comprehensive study materials including a summary, quiz questions, a quest learning path, and flashcards. You must respond using the generate_study_materials tool.`,
          },
          {
            role: "user",
            content: `Generate study materials from these documents:\n\n${combinedText.substring(0, 15000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_study_materials",
              description: "Generate structured study materials from document content",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "A comprehensive bullet-point summary of the key concepts. Use markdown bullet points.",
                  },
                  quizQuestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        correctIndex: { type: "integer" },
                      },
                      required: ["question", "options", "correctIndex"],
                      additionalProperties: false,
                    },
                    description: "5-8 multiple choice quiz questions with 4 options each",
                  },
                  questPath: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        level: { type: "integer" },
                        title: { type: "string" },
                        description: { type: "string" },
                        content: { type: "string", description: "Study content for this quest level" },
                        xp: { type: "integer" },
                      },
                      required: ["level", "title", "description", "content", "xp"],
                      additionalProperties: false,
                    },
                    description: "3-5 progressive learning quest levels",
                  },
                  flashcards: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        front: { type: "string", description: "The prompt/question side (concise)" },
                        back: { type: "string", description: "The answer/explanation side" },
                      },
                      required: ["front", "back"],
                      additionalProperties: false,
                    },
                    description: "8-15 flashcards covering key terms and concepts",
                  },
                },
                required: ["summary", "quizQuestions", "questPath", "flashcards"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_study_materials" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI request failed: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call response from AI");

    const materials = JSON.parse(toolCall.function.arguments);

    // 1. Create the canonical "class" row (single source of truth)
    const { data: cls, error: classError } = await supabase
      .from("classes")
      .insert({
        user_id: user.id,
        title: `Study: ${docNames}`,
        summary: materials.summary,
        source_document_ids: documentIds,
      })
      .select()
      .single();
    if (classError) throw classError;

    // 2. Link the source documents to this class
    await supabase.from("documents").update({ class_id: cls.id }).in("id", documentIds);

    // 3. Save study session linked to class
    const { data: session, error: sessionError } = await supabase
      .from("study_sessions")
      .insert({
        user_id: user.id,
        class_id: cls.id,
        title: `Study: ${docNames}`,
        type: "summary",
        summary: materials.summary,
        document_ids: documentIds,
      })
      .select()
      .single();
    if (sessionError) throw sessionError;

    // 4. Save quiz
    const { error: quizError } = await supabase.from("quizzes").insert({
      user_id: user.id,
      session_id: session.id,
      class_id: cls.id,
      title: `Quiz: ${docNames}`,
      questions: materials.quizQuestions,
      total: materials.quizQuestions.length,
    });
    if (quizError) console.error("Quiz insert error:", quizError);

    // 5. Save quests
    const questInserts = materials.questPath.map((q: any, i: number) => ({
      user_id: user.id,
      session_id: session.id,
      level: q.level,
      title: q.title,
      description: q.description,
      content: q.content,
      xp: q.xp,
      status: i === 0 ? "current" : "locked",
    }));
    const { error: questError } = await supabase.from("quests").insert(questInserts);
    if (questError) console.error("Quest insert error:", questError);

    // 6. Save flashcards
    const flashInserts = (materials.flashcards || []).map((f: any, i: number) => ({
      user_id: user.id,
      class_id: cls.id,
      front: f.front,
      back: f.back,
      position: i,
    }));
    if (flashInserts.length) {
      const { error: flashError } = await supabase.from("flashcards").insert(flashInserts);
      if (flashError) console.error("Flashcard insert error:", flashError);
    }

    return new Response(JSON.stringify({
      classId: cls.id,
      sessionId: session.id,
      summary: materials.summary,
      quizCount: materials.quizQuestions.length,
      questCount: materials.questPath.length,
      flashcardCount: flashInserts.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
