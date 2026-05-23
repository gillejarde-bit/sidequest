-- 003_locations_and_presence.sql

-- Define the user_locations table
DROP TABLE IF EXISTS public.user_locations;
CREATE TABLE public.user_locations (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    lat FLOAT8 NOT NULL,
    lng FLOAT8 NOT NULL,
    heading FLOAT4,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- Add RLS to user_locations
-- Users can upsert their own row only (INSERT WITH CHECK, UPDATE USING).
DROP POLICY IF EXISTS "Users can insert their own location" ON public.user_locations;
CREATE POLICY "Users can insert their own location" ON public.user_locations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own location" ON public.user_locations;
CREATE POLICY "Users can update their own location" ON public.user_locations
    FOR UPDATE USING (auth.uid() = user_id);

-- Authenticated users can SELECT all rows.
DROP POLICY IF EXISTS "Authenticated users can select all locations" ON public.user_locations;
CREATE POLICY "Authenticated users can select all locations" ON public.user_locations
    FOR SELECT USING (auth.role() = 'authenticated');


-- Seed the locations table with 20 real Las Vegas POIs using actual coordinates.
-- Mix categories ('food', 'outdoors', 'nightlife', 'culture', 'fitness', 'gaming', 'other').
-- is_hidden_gem should be false for all seeds.
-- geo column is PostGIS geography(Point, 4326): use ST_SetSRID(ST_MakePoint(lng, lat), 4326).
-- INSERTS must use ON CONFLICT DO NOTHING to ensure idempotency.

INSERT INTO public.locations (id, name, category, description, address, geo, is_hidden_gem)
VALUES
    (gen_random_uuid(), 'Fremont Street Experience', 'nightlife', 'Pedestrian mall and attraction in downtown Las Vegas.', 'Fremont St, Las Vegas, NV 89101', ST_SetSRID(ST_MakePoint(-115.1440, 36.1700), 4326), false),
    (gen_random_uuid(), 'Red Rock Canyon Visitor Center', 'outdoors', 'National Conservation Area with desert landscape.', '1000 Scenic Loop Dr, Las Vegas, NV 89161', ST_SetSRID(ST_MakePoint(-115.4271, 36.1350), 4326), false),
    (gen_random_uuid(), 'Allegiant Stadium', 'culture', 'Domed stadium located in Paradise, Nevada.', '3333 Al Davis Way, Las Vegas, NV 89118', ST_SetSRID(ST_MakePoint(-115.1833, 36.0908), 4326), false),
    (gen_random_uuid(), 'Las Vegas Rock Gym', 'fitness', 'Indoor rock climbing facility.', '8201 W Alexander Rd, Las Vegas, NV 89129', ST_SetSRID(ST_MakePoint(-115.1380, 36.1540), 4326), false),
    (gen_random_uuid(), 'Sunrise Coffee', 'food', 'Independent coffee shop offering organic and fair-trade beans.', '3130 E Sunset Rd, Las Vegas, NV 89120', ST_SetSRID(ST_MakePoint(-115.1200, 36.1750), 4326), false),
    (gen_random_uuid(), 'The Arts District', 'culture', 'Cultural hub known for indie art galleries and performance spaces.', '1800 S Industrial Rd, Las Vegas, NV 89102', ST_SetSRID(ST_MakePoint(-115.1580, 36.1620), 4326), false),
    (gen_random_uuid(), 'Springs Preserve', 'outdoors', '180-acre botanical garden and museum facility.', '333 S Valley View Blvd, Las Vegas, NV 89107', ST_SetSRID(ST_MakePoint(-115.1978, 36.1763), 4326), false),
    (gen_random_uuid(), 'Velveteen Rabbit Bar', 'nightlife', 'Craft cocktail and beer bar with an eclectic vibe.', '1218 S Main St, Las Vegas, NV 89104', ST_SetSRID(ST_MakePoint(-115.1565, 36.1638), 4326), false),
    (gen_random_uuid(), 'Fergusons Downtown', 'culture', 'Community space hosting local shops and events.', '1028 E Fremont St, Las Vegas, NV 89101', ST_SetSRID(ST_MakePoint(-115.1442, 36.1697), 4326), false),
    (gen_random_uuid(), 'Desert Breeze Park', 'outdoors', 'Large public park with sports facilities and a skate park.', '8275 Spring Mountain Rd, Las Vegas, NV 89117', ST_SetSRID(ST_MakePoint(-115.2480, 36.1270), 4326), false),
    (gen_random_uuid(), 'Bellagio Fountains', 'culture', 'Choreographed water feature with performances set to light and music.', '3600 S Las Vegas Blvd, Las Vegas, NV 89109', ST_SetSRID(ST_MakePoint(-115.1740, 36.1126), 4326), false),
    (gen_random_uuid(), 'The Neon Museum', 'culture', 'Museum showcasing iconic Las Vegas signs.', '770 Las Vegas Blvd N, Las Vegas, NV 89101', ST_SetSRID(ST_MakePoint(-115.1354, 36.1769), 4326), false),
    (gen_random_uuid(), 'Seven Magic Mountains', 'outdoors', 'Desert art installation featuring colorful stacked boulders.', 'S Las Vegas Blvd, Las Vegas, NV 89054', ST_SetSRID(ST_MakePoint(-115.2709, 35.8386), 4326), false),
    (gen_random_uuid(), 'Lotus of Siam', 'food', 'Renowned Northern Thai restaurant.', '620 E Flamingo Rd, Las Vegas, NV 89119', ST_SetSRID(ST_MakePoint(-115.1517, 36.1146), 4326), false),
    (gen_random_uuid(), 'Pinball Hall of Fame', 'gaming', 'Museum containing the world''s largest pinball collection.', '4915 S Las Vegas Blvd, Las Vegas, NV 89119', ST_SetSRID(ST_MakePoint(-115.1735, 36.0988), 4326), false),
    (gen_random_uuid(), 'Mob Museum', 'culture', 'Museum dedicated to the history of organized crime and law enforcement.', '300 Stewart Ave, Las Vegas, NV 89101', ST_SetSRID(ST_MakePoint(-115.1412, 36.1728), 4326), false),
    (gen_random_uuid(), 'Ethel M Botanical Cactus Garden', 'outdoors', 'Three-acre botanical garden featuring drought-tolerant plants.', '2 Cactus Garden Dr, Henderson, NV 89014', ST_SetSRID(ST_MakePoint(-115.0645, 36.0617), 4326), false),
    (gen_random_uuid(), 'Tacos El Gordo', 'food', 'Popular spot for authentic Tijuana-style tacos.', '3041 S Las Vegas Blvd, Las Vegas, NV 89109', ST_SetSRID(ST_MakePoint(-115.1639, 36.1311), 4326), false),
    (gen_random_uuid(), 'OMNIA Nightclub', 'nightlife', 'Multi-level nightclub at Caesars Palace.', '3570 S Las Vegas Blvd, Las Vegas, NV 89109', ST_SetSRID(ST_MakePoint(-115.1746, 36.1165), 4326), false),
    (gen_random_uuid(), 'Life Time Athletic', 'fitness', 'High-end fitness center and health club.', '10721 W Charleston Blvd, Las Vegas, NV 89135', ST_SetSRID(ST_MakePoint(-115.3283, 36.1594), 4326), false)
ON CONFLICT DO NOTHING;
