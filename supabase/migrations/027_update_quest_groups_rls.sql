-- Drop old select policy on quest_groups
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.quest_groups;

-- Create updated select policy allowing creators to view their groups
CREATE POLICY "Users can view groups they belong to" ON public.quest_groups
  FOR SELECT USING (
    public.is_group_member(id, auth.uid())
    OR created_by = auth.uid()
  );

-- Fix orphaned groups: insert creator into group_members if not present
INSERT INTO public.group_members (group_id, user_id, role)
SELECT id, created_by, 'creator'
FROM public.quest_groups
WHERE created_by IS NOT NULL
ON CONFLICT (group_id, user_id) DO NOTHING;
