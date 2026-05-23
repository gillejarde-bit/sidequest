-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- USERS (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  bio text,
  level int DEFAULT 1,
  xp int DEFAULT 0,
  title text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SOCIAL
CREATE TABLE friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- LOCATIONS (POIs + Hidden Gems unified)
CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text CHECK (category IN ('food', 'outdoors', 'nightlife', 'culture', 'fitness', 'gaming', 'other')),
  geo geography(Point, 4326) NOT NULL,
  address text,
  google_place_id text,
  osm_id text,
  is_hidden_gem boolean DEFAULT false,
  gem_status text CHECK (gem_status IN ('pending', 'approved', 'rejected') OR gem_status IS NULL),
  discoverer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  description text,
  photo_urls text[],
  avg_rating numeric,
  visit_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_locations_geo ON locations USING GIST (geo);
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- TEMPLATES
CREATE TABLE quest_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  vibe text CHECK (vibe IN ('chill', 'wild', 'active', 'cultural', 'cozy', 'chaotic')),
  default_location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  cost_tier int CHECK (cost_tier >= 0 AND cost_tier <= 3),
  use_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quest_templates ENABLE ROW LEVEL SECURITY;

-- QUESTS
CREATE TABLE quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text,
  vibe text CHECK (vibe IN ('chill', 'wild', 'active', 'cultural', 'cozy', 'chaotic')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  cost_tier int CHECK (cost_tier >= 0 AND cost_tier <= 3),
  max_party_size int,
  privacy text CHECK (privacy IN ('friends', 'group', 'public')),
  status text CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  template_id uuid REFERENCES quest_templates(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

-- QUEST PARTICIPATION  
CREATE TABLE quest_invites (
  quest_id uuid REFERENCES quests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'accepted', 'declined')),
  rsvp_at timestamptz,
  PRIMARY KEY (quest_id, user_id)
);
ALTER TABLE quest_invites ENABLE ROW LEVEL SECURITY;

CREATE TABLE quest_attendance (
  quest_id uuid REFERENCES quests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  arrived_at timestamptz,
  departed_at timestamptz,
  xp_awarded boolean DEFAULT false,
  PRIMARY KEY (quest_id, user_id)
);
ALTER TABLE quest_attendance ENABLE ROW LEVEL SECURITY;

-- HIDDEN GEMS
CREATE TABLE gem_votes (
  gem_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  voter_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  vote smallint CHECK (vote IN (1, -1)),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (gem_id, voter_id)
);
ALTER TABLE gem_votes ENABLE ROW LEVEL SECURITY;

CREATE TABLE gem_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gem_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  rater_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  rating int CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  photo_urls text[],
  created_at timestamptz DEFAULT now()
);
ALTER TABLE gem_ratings ENABLE ROW LEVEL SECURITY;

-- XP SYSTEM (append-only log)
CREATE TABLE xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  points int NOT NULL,
  reference_id uuid,
  reference_type text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

-- Trigger for XP and Level
CREATE OR REPLACE FUNCTION update_user_xp_and_level()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET 
    xp = xp + NEW.points,
    level = floor(sqrt((xp + NEW.points) / 100)) + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_user_xp
AFTER INSERT ON xp_events
FOR EACH ROW
EXECUTE FUNCTION update_user_xp_and_level();

-- CHAT (quest-scoped, ephemeral)
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid REFERENCES quests(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
