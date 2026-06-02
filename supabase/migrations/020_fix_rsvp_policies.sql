-- Database Migration: Fix quest_invites RLS policies to allow joining and updating RSVPs

-- 1. Drop existing restricted insert policy
DROP POLICY IF EXISTS "Users can insert invites" ON public.quest_invites;

-- 2. Define scoped INSERT policy allowing users to join public quests, group quests, friends quests, or insert for themselves
CREATE POLICY "Users can insert invites" ON public.quest_invites
    FOR INSERT TO authenticated
    WITH CHECK (
        -- Allow the host/creator to invite others
        EXISTS (
            SELECT 1 FROM public.quests q
            WHERE q.id = quest_id AND q.creator_id = auth.uid()
        )
        -- OR allow users to insert their own RSVP (joining)
        OR (
            auth.uid() = user_id
            AND EXISTS (
                SELECT 1 FROM public.quests q
                WHERE q.id = quest_id
                AND (
                    -- Public quests can be joined by anyone
                    q.privacy = 'public'
                    -- Group quests can be joined by group members
                    OR (
                        q.privacy = 'group'
                        AND EXISTS (
                            SELECT 1 FROM public.group_members gm
                            WHERE gm.group_id = q.group_id AND gm.user_id = auth.uid()
                        )
                    )
                    -- Friends quests can be joined by friends of the creator
                    OR (
                        q.privacy = 'friends'
                        AND EXISTS (
                            SELECT 1 FROM public.friendships f
                            WHERE f.status = 'accepted'
                            AND ((f.user_id = auth.uid() AND f.friend_id = q.creator_id)
                              OR (f.friend_id = auth.uid() AND f.user_id = q.creator_id))
                        )
                    )
                )
            )
        )
    );

-- 3. Define UPDATE policy allowing users to accept / decline invitations sent to them
DROP POLICY IF EXISTS "Users can update their own invites" ON public.quest_invites;
CREATE POLICY "Users can update their own invites" ON public.quest_invites
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Refresh PostgREST schema cache to ensure changes are live immediately
NOTIFY pgrst, 'reload schema';
