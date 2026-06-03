-- Add group_type, xp, and level to quest_groups table
ALTER TABLE public.quest_groups ADD COLUMN IF NOT EXISTS group_type text DEFAULT 'Social';
ALTER TABLE public.quest_groups ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0;
ALTER TABLE public.quest_groups ADD COLUMN IF NOT EXISTS level integer DEFAULT 1;
