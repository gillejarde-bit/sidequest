-- ===========================================================================
-- SideQuest: Test Account Clean & Safe Database Wipe Script
-- ===========================================================================
-- Run this script inside your Supabase Dashboard SQL Editor to wipe all 
-- created test users and reset the database for fresh onboarding validation.
--
-- Note: This safely cascades and deletes all related profiles, friendships, 
-- hidden gems (locations), quests, invites, and chats because of Postgres 
-- FOREIGN KEY cascades.
-- ===========================================================================

-- 1. Wipe all authentication user accounts (cascades to public.profiles)
DELETE FROM auth.users;

-- 2. Clear other standalone seed locations if needed (Optional)
-- DELETE FROM public.locations WHERE is_hidden_gem = true;

-- 3. Confirm success
SELECT 'Database successfully wiped!' AS status;
