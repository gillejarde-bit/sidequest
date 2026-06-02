-- Database Migration: Repair profiles table gamification columns
-- This adds missing columns to the public.profiles table to support daily streaks, RPG lives, and location sharing preferences

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS share_location boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location_sharing_scope text DEFAULT 'friends' CHECK (location_sharing_scope IN ('friends', 'crews', 'nearby'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lives int DEFAULT 3 CHECK (lives >= 0 AND lives <= 3);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS previous_streak int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_last_active_date date;

-- Establish default values for any rows where columns are null
UPDATE public.profiles SET share_location = false WHERE share_location IS NULL;
UPDATE public.profiles SET location_sharing_scope = 'friends' WHERE location_sharing_scope IS NULL;
UPDATE public.profiles SET lives = 3 WHERE lives IS NULL;
UPDATE public.profiles SET previous_streak = 0 WHERE previous_streak IS NULL;

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
