-- Migration: Add inclusive profile fields for onboarding
-- Idempotent schema upgrades

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS birthdate date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS pronouns text;
