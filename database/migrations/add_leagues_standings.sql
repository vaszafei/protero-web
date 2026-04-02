-- Add leagues and standings tables to Supabase
-- Run this in Supabase SQL Editor

-- Leagues table
CREATE TABLE IF NOT EXISTS leagues (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flag TEXT,
  country TEXT,
  current_round INTEGER DEFAULT 1,
  season TEXT DEFAULT '2025-2026',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Standings table
CREATE TABLE IF NOT EXISTS standings (
  id BIGSERIAL PRIMARY KEY,
  league_key TEXT NOT NULL REFERENCES leagues(key) ON DELETE CASCADE,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season TEXT DEFAULT '2025-2026',
  gp INTEGER DEFAULT 0,  -- games played
  w INTEGER DEFAULT 0,   -- wins
  d INTEGER DEFAULT 0,   -- draws
  l INTEGER DEFAULT 0,   -- losses
  gf INTEGER DEFAULT 0,  -- goals for
  ga INTEGER DEFAULT 0,  -- goals against
  pts INTEGER DEFAULT 0, -- points
  form TEXT,             -- recent form (e.g., "WWDLL")
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(league_key, team_id, season)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_standings_league ON standings(league_key);
CREATE INDEX IF NOT EXISTS idx_standings_team ON standings(team_id);
CREATE INDEX IF NOT EXISTS idx_standings_season ON standings(season);
CREATE INDEX IF NOT EXISTS idx_standings_points ON standings(pts DESC);

-- Trigger for updated_at
CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON leagues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_standings_updated_at BEFORE UPDATE ON standings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read leagues" ON leagues FOR SELECT USING (true);
CREATE POLICY "Public read standings" ON standings FOR SELECT USING (true);
