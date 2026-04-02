-- ================================================
-- SUPABASE MISSING TABLES MIGRATION
-- ================================================
-- Purpose: Add missing tables referenced by API endpoints
-- Date: February 1, 2026
-- Safe: Uses IF NOT EXISTS to prevent duplication

-- ================================================
-- 1. LEAGUES TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS leagues (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  country TEXT,
  logo_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0, -- For display ordering
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_leagues_key ON leagues(key);
CREATE INDEX IF NOT EXISTS idx_leagues_active ON leagues(active);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_leagues_updated_at ON leagues;
CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON leagues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "Public read access for leagues" ON leagues;
CREATE POLICY "Public read access for leagues" ON leagues FOR SELECT USING (true);

-- Admin write access
DROP POLICY IF EXISTS "Admins can insert/update leagues" ON leagues;
CREATE POLICY "Admins can insert/update leagues" ON leagues FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ================================================
-- 2. STANDINGS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS standings (
  id BIGSERIAL PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES teams(id),
  league_key TEXT NOT NULL,
  season TEXT NOT NULL,
  
  -- Position
  position INTEGER NOT NULL,
  
  -- Match statistics
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  drawn INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  
  -- Goals
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_difference INTEGER DEFAULT 0,
  
  -- Points
  points INTEGER DEFAULT 0,
  
  -- Form (last 5 games: W, D, L)
  form TEXT, -- e.g., "WWDLW"
  
  -- Home/Away splits (optional)
  home_played INTEGER DEFAULT 0,
  home_won INTEGER DEFAULT 0,
  home_drawn INTEGER DEFAULT 0,
  home_lost INTEGER DEFAULT 0,
  home_gf INTEGER DEFAULT 0,
  home_ga INTEGER DEFAULT 0,
  
  away_played INTEGER DEFAULT 0,
  away_won INTEGER DEFAULT 0,
  away_drawn INTEGER DEFAULT 0,
  away_lost INTEGER DEFAULT 0,
  away_gf INTEGER DEFAULT 0,
  away_ga INTEGER DEFAULT 0,
  
  -- Metadata
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one row per team per league per season
  UNIQUE(team_id, league_key, season)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_standings_league_season ON standings(league_key, season);
CREATE INDEX IF NOT EXISTS idx_standings_team ON standings(team_id);
CREATE INDEX IF NOT EXISTS idx_standings_position ON standings(position);

-- Enable RLS
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "Public read access for standings" ON standings;
CREATE POLICY "Public read access for standings" ON standings FOR SELECT USING (true);

-- Admin write access
DROP POLICY IF EXISTS "Admins can insert/update standings" ON standings;
CREATE POLICY "Admins can insert/update standings" ON standings FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ================================================
-- 3. REFEREES TABLE (Optional but useful)
-- ================================================

CREATE TABLE IF NOT EXISTS referees (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  country TEXT,
  
  -- Career statistics
  total_games INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  penalties_awarded INTEGER DEFAULT 0,
  
  -- Averages
  avg_yellows_per_game NUMERIC(4,2) DEFAULT 0,
  avg_reds_per_game NUMERIC(4,2) DEFAULT 0,
  avg_penalties_per_game NUMERIC(4,2) DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_referees_name ON referees(name);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_referees_updated_at ON referees;
CREATE TRIGGER update_referees_updated_at BEFORE UPDATE ON referees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE referees ENABLE ROW LEVEL SECURITY;

-- Public read access
DROP POLICY IF EXISTS "Public read access for referees" ON referees;
CREATE POLICY "Public read access for referees" ON referees FOR SELECT USING (true);

-- Admin write access
DROP POLICY IF EXISTS "Admins can insert/update referees" ON referees;
CREATE POLICY "Admins can insert/update referees" ON referees FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ================================================
-- 4. ADD REFEREE_ID TO GAMES TABLE
-- ================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'referee_id'
  ) THEN
    ALTER TABLE games ADD COLUMN referee_id BIGINT REFERENCES referees(id);
    CREATE INDEX idx_games_referee ON games(referee_id);
  END IF;
END $$;

-- ================================================
-- 5. ADD FLASHSCORE_URL TO GAMES TABLE
-- ================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'flashscore_url'
  ) THEN
    ALTER TABLE games ADD COLUMN flashscore_url TEXT;
    CREATE INDEX idx_games_flashscore_url ON games(flashscore_url);
  END IF;
END $$;

-- ================================================
-- 6. INSERT INITIAL LEAGUE DATA (Safe - No Duplicates)
-- ================================================

-- Champions League
INSERT INTO leagues (key, name, country, priority, active) 
VALUES ('champions_league', 'UEFA Champions League', 'Europe', 1, true)
ON CONFLICT (key) DO NOTHING;

-- Europa League
INSERT INTO leagues (key, name, country, priority, active) 
VALUES ('europa_league', 'UEFA Europa League', 'Europe', 2, true)
ON CONFLICT (key) DO NOTHING;

-- Conference League
INSERT INTO leagues (key, name, country, priority, active) 
VALUES ('conference_league', 'UEFA Conference League', 'Europe', 3, true)
ON CONFLICT (key) DO NOTHING;

-- Premier League
INSERT INTO leagues (key, name, country, priority, active) 
VALUES ('premier_league', 'Premier League', 'England', 10, true)
ON CONFLICT (key) DO NOTHING;

-- La Liga
INSERT INTO leagues (key, name, country, priority, active) 
VALUES ('la_liga', 'La Liga', 'Spain', 11, true)
ON CONFLICT (key) DO NOTHING;

-- Bundesliga
INSERT INTO leagues (key, name, country, priority, active) 
VALUES ('bundesliga', 'Bundesliga', 'Germany', 12, true)
ON CONFLICT (key) DO NOTHING;

-- Serie A
INSERT INTO leagues (key, name, country, priority, active) 
VALUES ('serie_a', 'Serie A', 'Italy', 13, true)
ON CONFLICT (key) DO NOTHING;

-- Ligue 1
INSERT INTO leagues (key, name, country, priority, active) 
VALUES ('ligue_1', 'Ligue 1', 'France', 14, true)
ON CONFLICT (key) DO NOTHING;

-- Liga Portugal
INSERT INTO leagues (key, name, country, priority, active) 
VALUES ('liga_portugal', 'Liga Portugal', 'Portugal', 15, true)
ON CONFLICT (key) DO NOTHING;

-- Greek Super League
INSERT INTO leagues (key, name, country, priority, active) 
VALUES ('greek_super_league', 'Super League', 'Greece', 16, true)
ON CONFLICT (key) DO NOTHING;

-- Championship
INSERT INTO leagues (key, name, country, priority, active) 
VALUES ('championship', 'Championship', 'England', 20, true)
ON CONFLICT (key) DO NOTHING;

-- Ligue 2
INSERT INTO leagues (key, name, country, priority, active) 
VALUES ('ligue_2', 'Ligue 2', 'France', 21, true)
ON CONFLICT (key) DO NOTHING;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
-- Summary:
-- ✅ Created leagues table with initial data
-- ✅ Created standings table
-- ✅ Created referees table
-- ✅ Added referee_id to games
-- ✅ Added flashscore_url to games
-- ✅ All with IF NOT EXISTS - safe to run multiple times
-- ✅ No data duplication possible
