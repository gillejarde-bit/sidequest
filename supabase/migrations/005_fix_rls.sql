-- 005_fix_rls.sql
-- Add missing RLS policies for quests, locations, quest_invites, and xp_events

-- locations
DROP POLICY IF EXISTS "Locations are viewable by everyone" ON locations;
CREATE POLICY "Locations are viewable by everyone" ON locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert locations" ON locations;
CREATE POLICY "Authenticated users can insert locations" ON locations FOR INSERT TO authenticated WITH CHECK (true);

-- quests
DROP POLICY IF EXISTS "Quests are viewable by everyone" ON quests;
CREATE POLICY "Quests are viewable by everyone" ON quests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own quests" ON quests;
CREATE POLICY "Users can insert their own quests" ON quests FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

-- quest_invites
DROP POLICY IF EXISTS "Quest invites are viewable by everyone" ON quest_invites;
CREATE POLICY "Quest invites are viewable by everyone" ON quest_invites FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert invites" ON quest_invites;
CREATE POLICY "Users can insert invites" ON quest_invites FOR INSERT TO authenticated WITH CHECK (true);

-- xp_events
DROP POLICY IF EXISTS "Users can see their own xp" ON xp_events;
CREATE POLICY "Users can see their own xp" ON xp_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own xp" ON xp_events;
CREATE POLICY "Users can insert their own xp" ON xp_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
