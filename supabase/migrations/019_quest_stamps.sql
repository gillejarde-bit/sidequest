-- Database Migration: Quest Completed Stamps Log Table

CREATE TABLE IF NOT EXISTS public.quest_stamps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id    uuid REFERENCES public.quests(id) ON DELETE SET NULL,
  stamp_kind  text NOT NULL,            -- food|outdoors|nightlife|culture|fitness|gem
  is_foil     boolean NOT NULL DEFAULT false,
  is_pioneer  boolean NOT NULL DEFAULT false,
  district    text,
  first_visit boolean NOT NULL DEFAULT false,
  earned_at   timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quest_stamps ENABLE ROW LEVEL SECURITY;

-- Disable policies if they exist before creating
DROP POLICY IF EXISTS "own stamps select" ON public.quest_stamps;
DROP POLICY IF EXISTS "own stamps insert" ON public.quest_stamps;

-- Create Policies
CREATE POLICY "own stamps select" ON public.quest_stamps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own stamps insert" ON public.quest_stamps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Performance Index for chronological history pagination
CREATE INDEX IF NOT EXISTS quest_stamps_user_time ON public.quest_stamps (user_id, earned_at DESC);
