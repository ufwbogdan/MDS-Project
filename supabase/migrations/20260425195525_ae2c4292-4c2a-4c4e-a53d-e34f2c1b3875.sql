
-- 1. classes table (single source of truth per lesson)
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  source_document_ids UUID[] NOT NULL DEFAULT '{}',
  audio_url TEXT,
  audio_status TEXT NOT NULL DEFAULT 'none',
  is_public BOOLEAN NOT NULL DEFAULT false,
  share_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own classes"
  ON public.classes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view public classes"
  ON public.classes FOR SELECT TO anon, authenticated
  USING (is_public = true);

CREATE INDEX idx_classes_user ON public.classes(user_id);
CREATE INDEX idx_classes_public ON public.classes(is_public) WHERE is_public = true;

-- 2. flashcards table
CREATE TABLE public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  ease NUMERIC NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own flashcards"
  ON public.flashcards FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view flashcards of public classes"
  ON public.flashcards FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = flashcards.class_id AND c.is_public = true));

CREATE INDEX idx_flashcards_class ON public.flashcards(class_id);
CREATE INDEX idx_flashcards_due ON public.flashcards(user_id, due_at);

-- 3. link existing tables to classes
ALTER TABLE public.study_sessions ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;
ALTER TABLE public.quizzes ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;
ALTER TABLE public.documents ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

-- 4. updated_at trigger for classes
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_classes_updated
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. backfill: one class per existing study_session
INSERT INTO public.classes (id, user_id, title, summary, source_document_ids, created_at)
SELECT gen_random_uuid(), s.user_id, s.title, s.summary, s.document_ids, s.created_at
FROM public.study_sessions s
WHERE s.class_id IS NULL;

UPDATE public.study_sessions s
SET class_id = c.id
FROM public.classes c
WHERE s.class_id IS NULL
  AND c.user_id = s.user_id
  AND c.title = s.title
  AND c.created_at = s.created_at;

UPDATE public.quizzes q
SET class_id = s.class_id
FROM public.study_sessions s
WHERE q.session_id = s.id AND q.class_id IS NULL;
