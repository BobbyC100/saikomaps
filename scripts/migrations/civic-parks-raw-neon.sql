-- =============================================================================
-- Saiko Maps — civic_parks_raw staging table (Neon)
--
-- Run against Neon via:
--   node -r ./scripts/load-env.js -e "..."
--   or paste into your Neon console
--
-- This is the canonical location for this table. Any prior version on
-- Supabase should be dropped after confirming this one is live.
-- =============================================================================

CREATE TABLE IF NOT EXISTS civic_parks_raw (
  id                        SERIAL PRIMARY KEY,

  -- Source provenance
  source_name               TEXT NOT NULL DEFAULT 'lacounty_rap_parks',
  source_unit_id            INTEGER,
  fetched_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Identity
  park_name                 TEXT NOT NULL,
  address                   TEXT,
  city                      TEXT,
  zip                       TEXT,
  access_type               TEXT,
  acres                     NUMERIC,

  -- Location (WGS84)
  latitude                  NUMERIC,
  longitude                 NUMERIC,

  -- Hours (raw HTML from source)
  hours_raw                 TEXT,

  -- Amenity counts
  amenity_tennis            INTEGER DEFAULT 0,
  amenity_basketball        INTEGER DEFAULT 0,
  amenity_baseball          INTEGER DEFAULT 0,
  amenity_soccer            INTEGER DEFAULT 0,
  amenity_multipurpose_field INTEGER DEFAULT 0,
  amenity_fitness_zone      INTEGER DEFAULT 0,
  amenity_skate_park        INTEGER DEFAULT 0,
  amenity_picnic            INTEGER DEFAULT 0,
  amenity_playground        INTEGER DEFAULT 0,
  amenity_pool              INTEGER DEFAULT 0,
  amenity_splash_pad        INTEGER DEFAULT 0,
  amenity_dog_park          INTEGER DEFAULT 0,
  amenity_gym               INTEGER DEFAULT 0,
  amenity_community_center  INTEGER DEFAULT 0,
  amenity_senior_center     INTEGER DEFAULT 0,
  amenity_golf              INTEGER DEFAULT 0,
  amenity_lawn_bowling      INTEGER DEFAULT 0,

  -- Quality flags
  amenities_reported        BOOLEAN DEFAULT FALSE,
  has_any_amenity           BOOLEAN GENERATED ALWAYS AS (
    amenity_tennis > 0 OR amenity_basketball > 0 OR amenity_baseball > 0 OR
    amenity_soccer > 0 OR amenity_multipurpose_field > 0 OR amenity_fitness_zone > 0 OR
    amenity_skate_park > 0 OR amenity_picnic > 0 OR amenity_playground > 0 OR
    amenity_pool > 0 OR amenity_splash_pad > 0 OR amenity_dog_park > 0 OR
    amenity_gym > 0 OR amenity_community_center > 0 OR amenity_senior_center > 0 OR
    amenity_golf > 0 OR amenity_lawn_bowling > 0
  ) STORED,

  -- Processing state
  processed                 BOOLEAN DEFAULT FALSE,
  entity_id                 TEXT,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_civic_parks_raw_location
  ON civic_parks_raw (latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_civic_parks_raw_has_amenity
  ON civic_parks_raw (has_any_amenity);

CREATE INDEX IF NOT EXISTS idx_civic_parks_raw_entity
  ON civic_parks_raw (entity_id);

-- =============================================================================
-- Seed: 43 curated civic places
-- =============================================================================

-- PUBLIC POOLS (10)
INSERT INTO civic_parks_raw (source_name, fetched_at, park_name, city, amenities_reported, amenity_pool) VALUES
('saiko_curated', NOW(), 'Van Nuys Sherman Oaks Pool', 'Van Nuys', TRUE, 1),
('saiko_curated', NOW(), 'Santa Monica Swim Center', 'Santa Monica', TRUE, 1),
('saiko_curated', NOW(), 'Culver City Plunge', 'Culver City', TRUE, 1),
('saiko_curated', NOW(), 'Rose Bowl Aquatics Center', 'Pasadena', TRUE, 1),
('saiko_curated', NOW(), 'Belvedere Aquatic Center', 'East Los Angeles', TRUE, 1),
('saiko_curated', NOW(), 'Alondra Park Splash Pad & Pool', 'Lawndale', TRUE, 1),
('saiko_curated', NOW(), 'Verdugo Aquatic Facility', 'Burbank', TRUE, 1),
('saiko_curated', NOW(), 'Expo Center Pool (Robertson Recreation Center)', 'Los Angeles', TRUE, 1),
('saiko_curated', NOW(), 'Lincoln Park Pool', 'Los Angeles', TRUE, 1),
('saiko_curated', NOW(), 'Hansen Dam Aquatic Center', 'Lake View Terrace', TRUE, 1);

-- TENNIS COURTS (10)
INSERT INTO civic_parks_raw (source_name, fetched_at, park_name, city, amenities_reported, amenity_tennis) VALUES
('saiko_curated', NOW(), 'Griffith Park Tennis Courts', 'Los Angeles', TRUE, 1),
('saiko_curated', NOW(), 'Echo Park Tennis Courts', 'Los Angeles', TRUE, 1),
('saiko_curated', NOW(), 'Cheviot Hills Tennis Center', 'Los Angeles', TRUE, 1),
('saiko_curated', NOW(), 'Rancho Park Tennis Courts', 'Los Angeles', TRUE, 1),
('saiko_curated', NOW(), 'Balboa Tennis Center', 'Encino', TRUE, 1),
('saiko_curated', NOW(), 'Arcadia County Park Tennis Courts', 'Arcadia', TRUE, 1),
('saiko_curated', NOW(), 'Penmar Tennis Courts', 'Venice', TRUE, 1),
('saiko_curated', NOW(), 'Westwood Recreation Center Tennis Courts', 'Los Angeles', TRUE, 1),
('saiko_curated', NOW(), 'Beverly Hills Tennis (La Cienega Park Courts)', 'Beverly Hills', TRUE, 1),
('saiko_curated', NOW(), 'Santa Monica Memorial Park Tennis Courts', 'Santa Monica', TRUE, 1);

-- GOLF COURSES (10)
INSERT INTO civic_parks_raw (source_name, fetched_at, park_name, city, amenities_reported, amenity_golf) VALUES
('saiko_curated', NOW(), 'Rancho Park Golf Course', 'Los Angeles', TRUE, 1),
('saiko_curated', NOW(), 'Wilson Golf Course (Griffith Park)', 'Los Angeles', TRUE, 1),
('saiko_curated', NOW(), 'Harding Golf Course (Griffith Park)', 'Los Angeles', TRUE, 1),
('saiko_curated', NOW(), 'Angeles National Golf Club', 'Sunland', TRUE, 1),
('saiko_curated', NOW(), 'Balboa Golf Course', 'Encino', TRUE, 1),
('saiko_curated', NOW(), 'Encino Golf Course', 'Encino', TRUE, 1),
('saiko_curated', NOW(), 'DeBell Golf Club', 'Burbank', TRUE, 1),
('saiko_curated', NOW(), 'Los Verdes Golf Course', 'Rancho Palos Verdes', TRUE, 1),
('saiko_curated', NOW(), 'Alondra Park Golf Course', 'Lawndale', TRUE, 1),
('saiko_curated', NOW(), 'Brookside Golf Club (Pasadena)', 'Pasadena', TRUE, 1);

-- SOCCER FIELDS / COMPLEXES (10)
INSERT INTO civic_parks_raw (source_name, fetched_at, park_name, city, amenities_reported, amenity_soccer) VALUES
('saiko_curated', NOW(), 'SilverLakes Sports Complex', 'Norco', TRUE, 1),
('saiko_curated', NOW(), 'Griffith Park Soccer Fields', 'Los Angeles', TRUE, 1),
('saiko_curated', NOW(), 'Sepulveda Basin Soccer Complex', 'Encino', TRUE, 1),
('saiko_curated', NOW(), 'Lake Balboa Soccer Fields', 'Lake Balboa', TRUE, 1),
('saiko_curated', NOW(), 'Alondra Park Soccer Fields', 'Lawndale', TRUE, 1),
('saiko_curated', NOW(), 'Santa Monica Airport Park Fields', 'Santa Monica', TRUE, 1),
('saiko_curated', NOW(), 'El Sereno Recreation Center Fields', 'Los Angeles', TRUE, 1),
('saiko_curated', NOW(), 'Ted Watkins Memorial Park Fields', 'Los Angeles', TRUE, 1),
('saiko_curated', NOW(), 'Bell Gardens Sports Complex', 'Bell Gardens', TRUE, 1),
('saiko_curated', NOW(), 'Whittier Narrows Recreation Area Soccer Fields', 'South El Monte', TRUE, 1);

-- LAWN BOWLING (3)
INSERT INTO civic_parks_raw (source_name, fetched_at, park_name, city, amenities_reported, amenity_lawn_bowling) VALUES
('saiko_curated', NOW(), 'Santa Monica Lawn Bowling Club', 'Santa Monica', TRUE, 1),
('saiko_curated', NOW(), 'Hermosa Beach Lawn Bowling Club', 'Hermosa Beach', TRUE, 1),
('saiko_curated', NOW(), 'Burbank Lawn Bowling Club', 'Burbank', TRUE, 1);
