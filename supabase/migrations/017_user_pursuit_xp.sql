-- Database Migration: User Pursuit Experience Points & Location triggers

CREATE TABLE IF NOT EXISTS public.user_pursuit_xp (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pursuit_key  text NOT NULL,
  xp           integer NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pursuit_key)
);

ALTER TABLE public.user_pursuit_xp ENABLE ROW LEVEL SECURITY;

-- Disable policies if they exist before creating
DROP POLICY IF EXISTS "own xp select" ON public.user_pursuit_xp;
DROP POLICY IF EXISTS "own xp insert" ON public.user_pursuit_xp;
DROP POLICY IF EXISTS "own xp update" ON public.user_pursuit_xp;

CREATE POLICY "own xp select" ON public.user_pursuit_xp
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own xp insert" ON public.user_pursuit_xp
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own xp update" ON public.user_pursuit_xp
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Atomic increment function for client-initiated XP rewards (security definer)
CREATE OR REPLACE FUNCTION public.grant_pursuit_xp(p_pursuit text, p_amount int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_pursuit_xp(user_id, pursuit_key, xp)
  VALUES (auth.uid(), p_pursuit, p_amount)
  ON CONFLICT (user_id, pursuit_key)
  DO UPDATE SET xp = user_pursuit_xp.xp + excluded.xp, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_pursuit_xp TO authenticated;

-- Automated database trigger to award Discovery XP on Gem Nomination (10 XP) and Approval (25 XP)
CREATE OR REPLACE FUNCTION public.handle_location_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. On Gem Nomination (Insert)
  IF TG_OP = 'INSERT' AND NEW.is_hidden_gem = true AND NEW.nominated_by IS NOT NULL THEN
    INSERT INTO public.user_pursuit_xp(user_id, pursuit_key, xp)
    VALUES (NEW.nominated_by, 'discovery', 10)
    ON CONFLICT (user_id, pursuit_key)
    DO UPDATE SET xp = user_pursuit_xp.xp + 10, updated_at = now();

  -- 2. On Gem Approval (Update status from pending to approved)
  ELSIF TG_OP = 'UPDATE' AND OLD.gem_status = 'pending' AND NEW.gem_status = 'approved' AND NEW.nominated_by IS NOT NULL THEN
    INSERT INTO public.user_pursuit_xp(user_id, pursuit_key, xp)
    VALUES (NEW.nominated_by, 'discovery', 25)
    ON CONFLICT (user_id, pursuit_key)
    DO UPDATE SET xp = user_pursuit_xp.xp + 25, updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_location_xp ON public.locations;

CREATE TRIGGER tr_location_xp
AFTER INSERT OR UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.handle_location_xp();
