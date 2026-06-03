-- ==============================================================================
-- SIDEQUEST UNIVERSAL SCHEMA REPAIR SCRIPT
-- ==============================================================================
-- Copy and run this script inside your Supabase Dashboard SQL Editor (https://supabase.com)
-- This script will:
-- 1. Create quest_groups & group_members tables if they do not exist
-- 2. Alter the quests table to support group quests (adds group_id & is_group_quest)
-- 3. Add group_type, xp, and level to quest_groups if they don't exist
-- 4. Add group_code to quest_groups if it doesn't exist and generate codes
-- 5. Enable RLS and re-create SELECT/INSERT policies securely for groups and members
-- 6. Fix orphaned groups (insert creator into group_members if missing)
-- 7. Secure quests table select policy (hides quests from non-friends & non-invitees)
-- 8. Rebuild the get_my_streaks RPC to include group_code
-- 9. FORCE reload the PostgREST schema cache to fix all cache staleness immediately
-- ==============================================================================

-- 1. Create quest_groups & group_members tables if they do not exist
CREATE TABLE IF NOT EXISTS public.quest_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  group_color text DEFAULT '#6C63FF',
  avatar_url text,
  streak int DEFAULT 0,
  longest_streak int DEFAULT 0,
  last_quest_at timestamptz,
  streak_frozen bool DEFAULT false,
  member_count int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.group_members (
  group_id uuid REFERENCES public.quest_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- 2. Alter quests table to support group quests if columns don't exist
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.quest_groups(id) ON DELETE SET NULL;
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS is_group_quest bool DEFAULT false;

-- 3. Add group_type, xp, and level to quest_groups if they don't exist
ALTER TABLE public.quest_groups ADD COLUMN IF NOT EXISTS group_type text DEFAULT 'Social';
ALTER TABLE public.quest_groups ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0;
ALTER TABLE public.quest_groups ADD COLUMN IF NOT EXISTS level integer DEFAULT 1;

-- 4. Add group_code to quest_groups if it doesn't exist and generate codes
CREATE OR REPLACE FUNCTION generate_random_group_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * 36)::integer + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.quest_groups ADD COLUMN IF NOT EXISTS group_code text UNIQUE;

UPDATE public.quest_groups
SET group_code = generate_random_group_code()
WHERE group_code IS NULL;

-- 4.5 Create security definer function to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
$$;

-- 5. Enable RLS
ALTER TABLE public.quest_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- 6. Re-create SELECT/INSERT policies securely for groups and members
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.quest_groups;
CREATE POLICY "Users can view groups they belong to" ON public.quest_groups
  FOR SELECT USING (
    public.is_group_member(id, auth.uid())
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Anyone can create a group" ON public.quest_groups;
CREATE POLICY "Anyone can create a group" ON public.quest_groups
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Group creators can update their groups" ON public.quest_groups;
CREATE POLICY "Group creators can update their groups" ON public.quest_groups
  FOR UPDATE USING (
    created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;
CREATE POLICY "Users can view members of their groups" ON public.group_members
  FOR SELECT USING (
    public.is_group_member(group_id, auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can join a group" ON public.group_members;
CREATE POLICY "Anyone can join a group" ON public.group_members
  FOR INSERT WITH CHECK (true);

-- 6. Fix legacy orphaned groups: insert creator into group_members if not present
INSERT INTO public.group_members (group_id, user_id, role)
SELECT id, created_by, 'creator'
FROM public.quest_groups
WHERE created_by IS NOT NULL
ON CONFLICT (group_id, user_id) DO NOTHING;

-- 7. Secure quests table select policy (hides quests from non-friends & non-invitees)
DROP POLICY IF EXISTS "Quests are viewable by everyone" ON public.quests;
CREATE POLICY "Quests are viewable by everyone" ON public.quests
    FOR SELECT USING (
        creator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.quest_invites qi
            WHERE qi.quest_id = id AND qi.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'accepted'
            AND ((f.user_id = auth.uid() AND f.friend_id = creator_id)
              OR (f.friend_id = auth.uid() AND f.user_id = creator_id))
        )
        OR (
            group_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.group_members gm
                WHERE gm.group_id = quests.group_id AND gm.user_id = auth.uid()
            )
        )
    );

-- 8. Rebuild the get_my_streaks RPC to include group_code
CREATE OR REPLACE FUNCTION public.get_my_streaks()
RETURNS TABLE (
  group_id uuid,
  group_name text,
  group_color text,
  group_avatar text,
  current_streak int,
  longest_streak int,
  last_quest_at timestamptz,
  streak_frozen bool,
  member_count int,
  days_until_break int,
  next_milestone int,
  is_at_risk bool,
  group_code text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    g.id,
    g.name,
    g.group_color,
    g.avatar_url,
    g.streak,
    g.longest_streak,
    g.last_quest_at,
    g.streak_frozen,
    g.member_count,
    COALESCE(GREATEST(0, 7 - EXTRACT(DAY FROM now() - g.last_quest_at)::int), 7) as days_until_break,
    CASE
      WHEN g.streak < 3 THEN 3
      WHEN g.streak < 7 THEN 7
      WHEN g.streak < 14 THEN 14
      WHEN g.streak < 30 THEN 30
      ELSE 50
    END as next_milestone,
    COALESCE((EXTRACT(DAY FROM now() - g.last_quest_at)::int >= 5), false) as is_at_risk,
    g.group_code
  FROM public.quest_groups g
  JOIN public.group_members gm ON gm.group_id = g.id
  WHERE gm.user_id = auth.uid()
  ORDER BY g.streak DESC
$$;

GRANT EXECUTE ON FUNCTION public.get_my_streaks TO authenticated;

-- 9. FORCE reload PostgREST schema cache to solve cache mismatches instantly
NOTIFY pgrst, 'reload schema';
