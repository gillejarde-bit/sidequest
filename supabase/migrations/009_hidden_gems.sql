-- Wipe existing seeded Vegas data to start fresh for Phase 6
DELETE FROM quest_attendance;
DELETE FROM quests;
DELETE FROM locations;

-- 1. Add missing columns to locations table
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS nominated_by uuid REFERENCES profiles(id);

ALTER TABLE locations
ADD COLUMN IF NOT EXISTS nomination_photo_urls text[] DEFAULT '{}';

ALTER TABLE locations
ADD COLUMN IF NOT EXISTS nomination_description text;

ALTER TABLE locations
ADD COLUMN IF NOT EXISTS vote_count int DEFAULT 0;

ALTER TABLE locations
ADD COLUMN IF NOT EXISTS approval_threshold int DEFAULT 3;

ALTER TABLE locations
ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE locations
ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

ALTER TABLE locations
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 2. Enable Realtime on locations and gem_votes
ALTER PUBLICATION supabase_realtime ADD TABLE locations;
ALTER PUBLICATION supabase_realtime ADD TABLE gem_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE gem_ratings;

-- 3. RPC: nominate a hidden gem
CREATE OR REPLACE FUNCTION nominate_hidden_gem(
  p_name text,
  p_description text,
  p_category text,
  p_lat float8,
  p_lng float8,
  p_photo_urls text[],
  p_address text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_location_id uuid;
  v_existing_id uuid;
BEGIN
  -- Check if a gem already exists within 50 meters
  SELECT id INTO v_existing_id
  FROM locations
  WHERE ST_Distance(
    geo,
    ST_Point(p_lng, p_lat)::geography
  ) < 50
  AND is_hidden_gem = true
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'gem_too_close',
      'existing_id', v_existing_id
    );
  END IF;

  INSERT INTO locations (
    name, description, category,
    geo, address,
    is_hidden_gem, gem_status,
    nominated_by, nomination_description,
    nomination_photo_urls,
    approval_threshold
  ) VALUES (
    p_name, p_description, p_category,
    ST_Point(p_lng, p_lat)::geography,
    p_address,
    true, 'pending',
    auth.uid(), p_description,
    p_photo_urls,
    3
  )
  RETURNING id INTO v_location_id;

  -- Award nominator XP
  INSERT INTO xp_events
    (user_id, action_type, points,
     reference_id, reference_type)
  VALUES
    (auth.uid(), 'nominate_gem', 15,
     v_location_id, 'location');

  UPDATE profiles
  SET xp = xp + 15,
      level = floor(sqrt((xp + 15) / 100.0)) + 1
  WHERE id = auth.uid();

  RETURN json_build_object(
    'success', true,
    'location_id', v_location_id
  );
END;
$$;
GRANT EXECUTE ON FUNCTION nominate_hidden_gem TO authenticated;

-- 4. RPC: vote on a gem
CREATE OR REPLACE FUNCTION vote_on_gem(
  p_gem_id uuid,
  p_vote smallint
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_location locations%ROWTYPE;
  v_new_vote_count int;
  v_already_voted boolean;
BEGIN
  SELECT * INTO v_location
  FROM locations WHERE id = p_gem_id;

  IF v_location.gem_status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'voting_closed'
    );
  END IF;

  -- Cannot vote on own nomination
  IF v_location.nominated_by = auth.uid() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'cannot_vote_own'
    );
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM gem_votes
    WHERE gem_id = p_gem_id
    AND voter_id = auth.uid()
  ) INTO v_already_voted;

  IF v_already_voted THEN
    -- Update existing vote
    UPDATE gem_votes
    SET vote = p_vote
    WHERE gem_id = p_gem_id
    AND voter_id = auth.uid();
  ELSE
    INSERT INTO gem_votes (gem_id, voter_id, vote)
    VALUES (p_gem_id, auth.uid(), p_vote);
    
    -- Award XP for voting
    INSERT INTO xp_events
      (user_id, action_type, points,
       reference_id, reference_type)
    VALUES
      (auth.uid(), 'vote_gem', 5,
       p_gem_id, 'location');

    UPDATE profiles
    SET xp = xp + 5,
        level = floor(sqrt((xp + 5) / 100.0)) + 1
    WHERE id = auth.uid();
  END IF;

  -- Recalculate vote count (upvotes only)
  SELECT COUNT(*) INTO v_new_vote_count
  FROM gem_votes
  WHERE gem_id = p_gem_id AND vote = 1;

  -- Update vote_count on location
  UPDATE locations
  SET vote_count = v_new_vote_count
  WHERE id = p_gem_id;

  -- Auto-approve if threshold reached
  IF v_new_vote_count >= v_location.approval_threshold 
  THEN
    UPDATE locations
    SET gem_status = 'approved',
        approved_at = now()
    WHERE id = p_gem_id;

    -- Award discoverer the gem approval bonus
    INSERT INTO xp_events
      (user_id, action_type, points,
       reference_id, reference_type)
    VALUES
      (v_location.nominated_by, 
       'gem_approved', 50,
       p_gem_id, 'location');

    UPDATE profiles
    SET xp = xp + 50,
        total_gems_found = total_gems_found + 1,
        level = floor(sqrt((xp + 50) / 100.0)) + 1
    WHERE id = v_location.nominated_by;

    RETURN json_build_object(
      'success', true,
      'vote_count', v_new_vote_count,
      'gem_approved', true
    );
  END IF;

  -- Auto-reject if too many downvotes
  SELECT COUNT(*) INTO v_new_vote_count
  FROM gem_votes
  WHERE gem_id = p_gem_id AND vote = -1;

  IF v_new_vote_count >= 5 THEN
    UPDATE locations
    SET gem_status = 'rejected',
        rejected_at = now()
    WHERE id = p_gem_id;

    RETURN json_build_object(
      'success', true,
      'gem_rejected', true
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'vote_count', v_new_vote_count,
    'gem_approved', false
  );
END;
$$;
GRANT EXECUTE ON FUNCTION vote_on_gem TO authenticated;

-- 5. RPC: get gems for map and discovery
CREATE OR REPLACE FUNCTION get_hidden_gems(
  p_lat float8 DEFAULT 36.1699,
  p_lng float8 DEFAULT -115.1398,
  p_radius_meters int DEFAULT 50000,
  p_status text DEFAULT 'approved'
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  category text,
  lat float8,
  lng float8,
  vote_count int,
  gem_status text,
  nominated_by uuid,
  nominator_username text,
  nominator_avatar text,
  photo_urls text[],
  avg_rating numeric,
  visit_count int,
  approved_at timestamptz,
  distance_meters float8,
  user_voted boolean,
  user_vote smallint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    l.id, l.name, l.description, l.category,
    ST_Y(l.geo::geometry) as lat,
    ST_X(l.geo::geometry) as lng,
    l.vote_count, l.gem_status,
    l.nominated_by,
    p.username as nominator_username,
    p.avatar_url as nominator_avatar,
    l.nomination_photo_urls as photo_urls,
    l.avg_rating, l.visit_count,
    l.approved_at,
    ST_Distance(
      l.geo,
      ST_Point(p_lng, p_lat)::geography
    ) as distance_meters,
    EXISTS(
      SELECT 1 FROM gem_votes gv
      WHERE gv.gem_id = l.id
      AND gv.voter_id = auth.uid()
    ) as user_voted,
    (
      SELECT gv.vote FROM gem_votes gv
      WHERE gv.gem_id = l.id
      AND gv.voter_id = auth.uid()
      LIMIT 1
    ) as user_vote
  FROM locations l
  JOIN profiles p ON p.id = l.nominated_by
  WHERE l.is_hidden_gem = true
  AND (p_status = 'all' OR l.gem_status = p_status)
  AND ST_DWithin(
    l.geo,
    ST_Point(p_lng, p_lat)::geography,
    p_radius_meters
  )
  ORDER BY distance_meters ASC
$$;
GRANT EXECUTE ON FUNCTION get_hidden_gems TO authenticated;

-- 6. RPC: rate a gem after visiting
CREATE OR REPLACE FUNCTION rate_hidden_gem(
  p_gem_id uuid,
  p_rating int,
  p_review text DEFAULT NULL,
  p_photo_urls text[] DEFAULT '{}'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_already_rated boolean;
  v_visited boolean;
BEGIN
  -- Must have quested there to rate
  SELECT EXISTS(
    SELECT 1 FROM quest_attendance qa
    JOIN quests q ON q.id = qa.quest_id
    WHERE qa.user_id = auth.uid()
    AND q.location_id = p_gem_id
  ) INTO v_visited;

  IF NOT v_visited THEN
    RETURN json_build_object(
      'success', false,
      'error', 'must_visit_to_rate'
    );
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM gem_ratings
    WHERE gem_id = p_gem_id
    AND rater_id = auth.uid()
  ) INTO v_already_rated;

  IF v_already_rated THEN
    UPDATE gem_ratings
    SET rating = p_rating,
        review_text = p_review,
        photo_urls = p_photo_urls
    WHERE gem_id = p_gem_id
    AND rater_id = auth.uid();
  ELSE
    INSERT INTO gem_ratings
      (gem_id, rater_id, rating, 
       review_text, photo_urls)
    VALUES
      (p_gem_id, auth.uid(), p_rating,
       p_review, p_photo_urls);

    -- Award rating XP
    INSERT INTO xp_events
      (user_id, action_type, points,
       reference_id, reference_type)
    VALUES
      (auth.uid(), 'rate_gem', 10,
       p_gem_id, 'location');

    UPDATE profiles
    SET xp = xp + 10,
        level = floor(sqrt((xp + 10) / 100.0)) + 1
    WHERE id = auth.uid();
  END IF;

  -- Update avg_rating on location
  UPDATE locations
  SET avg_rating = (
    SELECT AVG(rating)::numeric(3,2)
    FROM gem_ratings
    WHERE gem_id = p_gem_id
  )
  WHERE id = p_gem_id;

  RETURN json_build_object(
    'success', true,
    'xp_awarded', CASE WHEN v_already_rated 
                       THEN 0 ELSE 10 END
  );
END;
$$;
GRANT EXECUTE ON FUNCTION rate_hidden_gem TO authenticated;

-- 7. Pioneer bonus check
-- We need to replace check_in_to_quest entirely to inject this logic
DROP FUNCTION IF EXISTS check_in_to_quest(uuid, double precision, double precision);
CREATE OR REPLACE FUNCTION check_in_to_quest(
  p_quest_id uuid,
  p_lat float8,
  p_lng float8
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quest quests%ROWTYPE;
  v_distance float8;
  v_xp_awarded int := 0;
  v_is_pioneer boolean;
BEGIN
  SELECT * INTO v_quest
  FROM quests WHERE id = p_quest_id;

  IF v_quest.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'quest_not_found');
  END IF;

  SELECT ST_Distance(
    (SELECT geo FROM locations WHERE id = v_quest.location_id),
    ST_Point(p_lng, p_lat)::geography
  ) INTO v_distance;

  IF v_distance > 500 THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'too_far',
      'distance', v_distance
    );
  END IF;

  INSERT INTO quest_attendance (quest_id, user_id, status, arrived_at)
  VALUES (p_quest_id, auth.uid(), 'arrived', now())
  ON CONFLICT (quest_id, user_id) 
  DO UPDATE SET status = 'arrived', arrived_at = now();

  -- Pioneer Check
  SELECT NOT EXISTS(
    SELECT 1 FROM quest_attendance qa2
    JOIN quests q2 ON q2.id = qa2.quest_id
    WHERE q2.location_id = v_quest.location_id
    AND qa2.user_id != auth.uid()
    AND qa2.arrived_at < now()
  ) INTO v_is_pioneer;

  IF v_is_pioneer THEN
    INSERT INTO xp_events (user_id, action_type, points, reference_id, reference_type)
    VALUES (auth.uid(), 'pioneer_location', 25, p_quest_id, 'quest');
    
    UPDATE profiles SET xp = xp + 25 WHERE id = auth.uid();
    v_xp_awarded := v_xp_awarded + 25;
  END IF;

  -- Regular checkin XP
  INSERT INTO xp_events (user_id, action_type, points, reference_id, reference_type)
  VALUES (auth.uid(), 'check_in', 20, p_quest_id, 'quest');

  UPDATE profiles
  SET xp = xp + 20,
      level = floor(sqrt((xp + 20) / 100.0)) + 1
  WHERE id = auth.uid();

  v_xp_awarded := v_xp_awarded + 20;

  RETURN json_build_object(
    'success', true,
    'xp_awarded', v_xp_awarded,
    'distance', v_distance,
    'is_pioneer', v_is_pioneer
  );
END;
$$;
GRANT EXECUTE ON FUNCTION check_in_to_quest TO authenticated;
