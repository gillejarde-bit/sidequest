-- Migration 029: Map Fog Coverage Storage
-- Create user_coverage table for storing coarse H3 cell exploration progress.

CREATE TABLE IF NOT EXISTS public.user_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  h3_cell text NOT NULL,
  district_id text,
  explored_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT user_h3_cell_unique UNIQUE (user_id, h3_cell)
);

-- Enable RLS
ALTER TABLE public.user_coverage ENABLE ROW LEVEL SECURITY;

-- Select policy: users can only see their own coverage
CREATE POLICY select_own_coverage ON public.user_coverage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Insert policy: users can only insert their own coverage
CREATE POLICY insert_own_coverage ON public.user_coverage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Delete policy: users can delete their own coverage
CREATE POLICY delete_own_coverage ON public.user_coverage
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_coverage_user_id ON public.user_coverage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coverage_h3_cell ON public.user_coverage(h3_cell);
