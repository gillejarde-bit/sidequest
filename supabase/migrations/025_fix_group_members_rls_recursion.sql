-- Create security definer function to avoid RLS recursion
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

-- Drop and recreate policy for group_members
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;
CREATE POLICY "Users can view members of their groups" ON public.group_members
  FOR SELECT USING (
    public.is_group_member(group_id, auth.uid())
  );

-- Drop and recreate policy for quest_groups
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.quest_groups;
CREATE POLICY "Users can view groups they belong to" ON public.quest_groups
  FOR SELECT USING (
    public.is_group_member(id, auth.uid())
  );
