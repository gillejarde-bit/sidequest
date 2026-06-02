-- ==============================================================================
-- SIDEQUEST UNIVERSAL SCHEMA REPAIR SCRIPT
-- ==============================================================================
-- Copy and run this script inside your Supabase Dashboard SQL Editor (https://supabase.com)
-- This script will:
-- 1. Create quest_groups & group_members tables if they do not exist
-- 2. Alter the quests table to support group quests (adds group_id & is_group_quest)
-- 3. Enable RLS and re-create strict privacy SELECT policies on quests and groups
-- 4. FORCE reload the PostgREST schema cache to fix all cache staleness immediately
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

-- 3. Enable RLS
ALTER TABLE public.quest_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- 4. Re-create SELECT/INSERT policies securely for groups and members
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

-- 5. Secure quests table select policy (hides quests from non-friends & non-invitees)
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

-- 6. FORCE reload PostgREST schema cache to solve cache mismatches instantly
NOTIFY pgrst, 'reload schema';
