
-- User streaks table
CREATE TABLE public.user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own streaks" ON public.user_streaks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User inventory table (for streak freezes, etc.)
CREATE TABLE public.user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type)
);
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own inventory" ON public.user_inventory FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User activity log for tracking quest progress
CREATE TABLE public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own activity" ON public.user_activity FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add new columns to quests for daily/weekly system
ALTER TABLE public.quests ADD COLUMN quest_period text NOT NULL DEFAULT 'daily';
ALTER TABLE public.quests ADD COLUMN quest_action text NOT NULL DEFAULT 'general';
ALTER TABLE public.quests ADD COLUMN target_count integer NOT NULL DEFAULT 1;
ALTER TABLE public.quests ADD COLUMN current_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.quests ADD COLUMN expires_at timestamp with time zone;

-- Clean up old quest data that used the old system
DELETE FROM public.quests;
