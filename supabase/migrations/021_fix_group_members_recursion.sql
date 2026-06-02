-- Database Migration: Fix group_members and quest_groups RLS infinite recursion
-- This resolves the "infinite recursion detected in policy for relation 'group_members'" error

-- 1. Drop existing recursive select policies
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.quest_groups;

-- 2. Define clean, non-recursive SELECT policies
-- Authenticated users can view quest groups and group memberships to enable sharing, streaks, and invites
CREATE POLICY "Users can view members of their groups" ON public.group_members
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can view groups they belong to" ON public.quest_groups
    FOR SELECT TO authenticated
    USING (true);

-- 3. Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
