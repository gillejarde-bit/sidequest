-- 1. Create a helper function to generate 6-character codes
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

-- 2. Add group_code column to quest_groups
ALTER TABLE public.quest_groups ADD COLUMN IF NOT EXISTS group_code text UNIQUE;

-- 3. Populate group_code for legacy groups
UPDATE public.quest_groups
SET group_code = generate_random_group_code()
WHERE group_code IS NULL;

-- 4. Rebuild the get_my_streaks RPC to include group_code
DROP FUNCTION IF EXISTS public.get_my_streaks();
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
