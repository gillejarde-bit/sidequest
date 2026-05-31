-- 1. Create quest_groups table
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

-- 2. Create group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id uuid REFERENCES public.quest_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- 3. Alter quests table to support group quests
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.quest_groups(id) ON DELETE SET NULL;
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS is_group_quest bool DEFAULT false;

-- 4. Enable RLS
ALTER TABLE public.quest_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- 5. Define Policies
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.quest_groups;
CREATE POLICY "Users can view groups they belong to" ON public.quest_groups
  FOR SELECT USING (
    id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
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
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can join a group" ON public.group_members;
CREATE POLICY "Anyone can join a group" ON public.group_members
  FOR INSERT WITH CHECK (true);

-- 6. RPC functions
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
  is_at_risk bool
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
    COALESCE((EXTRACT(DAY FROM now() - g.last_quest_at)::int >= 5), false) as is_at_risk
  FROM public.quest_groups g
  JOIN public.group_members gm ON gm.group_id = g.id
  WHERE gm.user_id = auth.uid()
  ORDER BY g.streak DESC
$$;

GRANT EXECUTE ON FUNCTION public.get_my_streaks TO authenticated;

-- 7. Add get_calendar_quests RPC function
CREATE OR REPLACE FUNCTION public.get_calendar_quests(
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  vibe text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text,
  location_name text,
  creator_username text,
  my_status text,
  attendee_count bigint,
  is_group_quest bool,
  group_name text,
  group_color text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    q.id, q.name, q.category, q.vibe,
    q.starts_at, q.ends_at, q.status,
    l.name as location_name,
    p.username as creator_username,
    my_invite.status as my_status,
    COUNT(DISTINCT qi.user_id) 
      FILTER (WHERE qi.status = 'accepted') 
      as attendee_count,
    q.is_group_quest,
    g.name as group_name,
    g.group_color
  FROM public.quests q
  JOIN public.locations l ON l.id = q.location_id
  JOIN public.profiles p ON p.id = q.creator_id
  LEFT JOIN public.quest_invites qi ON qi.quest_id = q.id
  LEFT JOIN public.quest_invites my_invite 
    ON my_invite.quest_id = q.id 
    AND my_invite.user_id = auth.uid()
  LEFT JOIN public.quest_groups g ON g.id = q.group_id
  WHERE q.starts_at >= p_start
    AND q.starts_at <= p_end
    AND (
      q.creator_id = auth.uid()
      OR my_invite.user_id = auth.uid()
    )
  GROUP BY q.id, l.name, p.username, 
    my_invite.status, g.name, g.group_color
  ORDER BY q.starts_at ASC
$$;

GRANT EXECUTE ON FUNCTION public.get_calendar_quests TO authenticated;
