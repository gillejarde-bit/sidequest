CREATE POLICY "Users can delete their own quests" ON quests FOR DELETE TO authenticated USING (auth.uid() = creator_id);
