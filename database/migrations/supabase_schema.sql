-- ================================================
-- SUPABASE MIGRATION SCHEMA
-- ================================================
-- Purpose: Complete database schema for Supabase migration from Turso
-- Date: January 26, 2026
-- Description: Replaces Turso with Supabase for PostgreSQL benefits

-- ================================================
-- 1. CORE TABLES - Games & Teams
-- ================================================

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  league_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games table (main data source)
CREATE TABLE IF NOT EXISTS games (
  id BIGSERIAL PRIMARY KEY,
  home_team_id BIGINT NOT NULL REFERENCES teams(id),
  away_team_id BIGINT NOT NULL REFERENCES teams(id),
  league_key TEXT NOT NULL,
  season TEXT NOT NULL,
  round INTEGER,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, postponed
  
  -- Results
  home_goals INTEGER,
  away_goals INTEGER,
  
  -- Expected Goals (xG)
  home_xg NUMERIC(4,2),
  away_xg NUMERIC(4,2),
  
  -- Possession
  home_possession NUMERIC(5,2),
  away_possession NUMERIC(5,2),
  
  -- Lineup data
  home_lineup_strength NUMERIC(5,4),
  away_lineup_strength NUMERIC(5,4),
  home_lineup_consistency NUMERIC(5,4),
  away_lineup_consistency NUMERIC(5,4),
  
  -- Metadata
  external_id TEXT UNIQUE, -- FBref or other source ID
  source TEXT DEFAULT 'fbref',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lineups table (player data per game)
CREATE TABLE IF NOT EXISTS lineups (
  id BIGSERIAL PRIMARY KEY,
  game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id BIGINT NOT NULL REFERENCES teams(id),
  player_name TEXT NOT NULL,
  position TEXT,
  minutes_played INTEGER,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 2. PREDICTIONS & ML MODELS
-- ================================================

-- Model versions tracking
CREATE TABLE IF NOT EXISTS model_versions (
  id BIGSERIAL PRIMARY KEY,
  version TEXT UNIQUE NOT NULL, -- v11, v12, v13, etc.
  name TEXT NOT NULL,
  description TEXT,
  
  -- Configuration
  features_used JSONB, -- Array of features used
  ensemble_weights JSONB, -- Model ensemble weights
  
  -- Performance metrics
  accuracy NUMERIC(5,2),
  home_accuracy NUMERIC(5,2),
  draw_accuracy NUMERIC(5,2),
  away_accuracy NUMERIC(5,2),
  over25_accuracy NUMERIC(5,2),
  btts_accuracy NUMERIC(5,2),
  
  -- Probability calibration
  brier_score NUMERIC(6,4), -- Lower is better (0 = perfect)
  log_loss NUMERIC(6,4),
  
  -- Betting performance
  roi NUMERIC(6,2), -- Return on investment %
  win_rate NUMERIC(5,2),
  avg_odds NUMERIC(5,2),
  total_bets INTEGER DEFAULT 0,
  profitable_bets INTEGER DEFAULT 0,
  
  -- Training info
  trained_on TEXT,
  tested_on TEXT,
  training_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Status
  is_active BOOLEAN DEFAULT FALSE, -- Only one active version
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id BIGSERIAL PRIMARY KEY,
  game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  model_version TEXT NOT NULL DEFAULT 'v11',
  
  -- Main prediction
  prediction TEXT NOT NULL, -- HOME, DRAW, AWAY
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  
  -- Probabilities (1X2)
  home_win_prob INTEGER CHECK (home_win_prob >= 0 AND home_win_prob <= 100),
  draw_prob INTEGER CHECK (draw_prob >= 0 AND draw_prob <= 100),
  away_win_prob INTEGER CHECK (away_win_prob >= 0 AND away_win_prob <= 100),
  
  -- Over/Under probabilities
  over25_prob INTEGER CHECK (over25_prob >= 0 AND over25_prob <= 100),
  under25_prob INTEGER CHECK (under25_prob >= 0 AND under25_prob <= 100),
  
  -- BTTS (Both Teams To Score)
  btts_prob INTEGER CHECK (btts_prob >= 0 AND btts_prob <= 100),
  
  -- Odds (for expected value calculation)
  odds_home NUMERIC(6,2),
  odds_draw NUMERIC(6,2),
  odds_away NUMERIC(6,2),
  odds_over25 NUMERIC(6,2),
  odds_under25 NUMERIC(6,2),
  
  -- Kelly Criterion & Expected Value
  expected_value NUMERIC(8,4), -- EV from Kelly criterion
  kelly_percentage NUMERIC(6,4), -- Recommended stake %
  
  -- Performance tracking
  result_correct BOOLEAN,
  brier_score NUMERIC(6,4),
  
  -- Model details
  model_details JSONB, -- Weights, features, ensemble info
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validated_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(game_id, model_version)
);

-- ================================================
-- 3. BETTING & WALLET SYSTEM
-- ================================================

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Default Wallet',
  balance NUMERIC(10,2) NOT NULL DEFAULT 1000.00,
  initial_balance NUMERIC(10,2) NOT NULL DEFAULT 1000.00,
  
  -- Performance tracking
  total_profit NUMERIC(10,2) DEFAULT 0.00,
  roi NUMERIC(6,2) DEFAULT 0.00,
  total_bets INTEGER DEFAULT 0,
  total_won INTEGER DEFAULT 0,
  total_lost INTEGER DEFAULT 0,
  win_rate NUMERIC(5,2) DEFAULT 0.00,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bets table
CREATE TABLE IF NOT EXISTS bets (
  id BIGSERIAL PRIMARY KEY,
  wallet_id BIGINT NOT NULL REFERENCES wallets(id),
  game_id BIGINT NOT NULL REFERENCES games(id),
  prediction_id BIGINT REFERENCES predictions(id),
  
  -- Bet details
  bet_type TEXT NOT NULL, -- HOME, DRAW, AWAY, OVER_25, UNDER_25, BTTS_YES, BTTS_NO
  stake NUMERIC(10,2) NOT NULL CHECK (stake > 0),
  odds NUMERIC(6,2) NOT NULL CHECK (odds >= 1.0),
  
  -- Prediction info
  predicted_prob INTEGER,
  expected_value NUMERIC(8,4),
  kelly_percentage NUMERIC(6,4),
  
  -- Result
  status TEXT DEFAULT 'pending', -- pending, won, lost, void
  profit NUMERIC(10,2),
  
  -- Metadata
  notes TEXT,
  placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settled_at TIMESTAMP WITH TIME ZONE
);

-- Strategy performance tracking
CREATE TABLE IF NOT EXISTS strategy_performance (
  id BIGSERIAL PRIMARY KEY,
  wallet_id BIGINT NOT NULL REFERENCES wallets(id),
  
  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL, -- daily, weekly, monthly
  
  -- Performance metrics
  total_bets INTEGER DEFAULT 0,
  won_bets INTEGER DEFAULT 0,
  lost_bets INTEGER DEFAULT 0,
  void_bets INTEGER DEFAULT 0,
  win_rate NUMERIC(5,2),
  
  -- Financial metrics
  total_staked NUMERIC(10,2) DEFAULT 0,
  total_profit NUMERIC(10,2) DEFAULT 0,
  roi NUMERIC(6,2),
  avg_odds NUMERIC(6,2),
  
  -- Strategy metrics
  singles_count INTEGER DEFAULT 0,
  parlays_count INTEGER DEFAULT 0,
  avg_stake NUMERIC(10,2),
  max_stake NUMERIC(10,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 4. AUTHENTICATION & USERS
-- ================================================

-- Users table (for admin panel)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- bcrypt hash
  email TEXT UNIQUE,
  role TEXT DEFAULT 'user', -- user, admin
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table (for JWT/session management)
CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- 5. INDEXES FOR PERFORMANCE
-- ================================================

-- Games indexes
CREATE INDEX IF NOT EXISTS idx_games_date ON games(date);
CREATE INDEX IF NOT EXISTS idx_games_league ON games(league_key);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_home_team ON games(home_team_id);
CREATE INDEX IF NOT EXISTS idx_games_away_team ON games(away_team_id);
CREATE INDEX IF NOT EXISTS idx_games_season ON games(season);

-- Predictions indexes
CREATE INDEX IF NOT EXISTS idx_predictions_game ON predictions(game_id);
CREATE INDEX IF NOT EXISTS idx_predictions_model ON predictions(model_version);
CREATE INDEX IF NOT EXISTS idx_predictions_confidence ON predictions(confidence);
CREATE INDEX IF NOT EXISTS idx_predictions_created ON predictions(created_at);

-- Bets indexes
CREATE INDEX IF NOT EXISTS idx_bets_wallet ON bets(wallet_id);
CREATE INDEX IF NOT EXISTS idx_bets_game ON bets(game_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_placed ON bets(placed_at);
CREATE INDEX IF NOT EXISTS idx_bets_settled ON bets(settled_at);

-- Lineups indexes
CREATE INDEX IF NOT EXISTS idx_lineups_game ON lineups(game_id);
CREATE INDEX IF NOT EXISTS idx_lineups_team ON lineups(team_id);

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_key);

-- ================================================
-- 6. VIEWS FOR ANALYTICS
-- ================================================

-- Active predictions view (upcoming games)
CREATE OR REPLACE VIEW v_active_predictions AS
SELECT 
  p.id,
  p.game_id,
  g.date as game_date,
  g.league_key,
  t1.name as home_team,
  t2.name as away_team,
  p.prediction,
  p.confidence,
  p.home_win_prob,
  p.draw_prob,
  p.away_win_prob,
  p.expected_value,
  p.kelly_percentage,
  p.model_version,
  p.created_at
FROM predictions p
JOIN games g ON p.game_id = g.id
JOIN teams t1 ON g.home_team_id = t1.id
JOIN teams t2 ON g.away_team_id = t2.id
WHERE g.status = 'scheduled'
  AND g.date >= NOW()
ORDER BY g.date ASC;

-- Model comparison view
CREATE OR REPLACE VIEW v_model_comparison AS
SELECT 
  mv.version,
  mv.name,
  mv.accuracy,
  mv.roi,
  mv.win_rate,
  mv.brier_score,
  mv.total_bets,
  mv.is_active,
  COUNT(p.id) as predictions_made,
  SUM(CASE WHEN p.result_correct = TRUE THEN 1 ELSE 0 END) as correct_predictions,
  AVG(p.confidence) as avg_confidence,
  AVG(p.brier_score) as actual_brier_score
FROM model_versions mv
LEFT JOIN predictions p ON p.model_version = mv.version
GROUP BY mv.id, mv.version, mv.name, mv.accuracy, mv.roi, mv.win_rate, 
         mv.brier_score, mv.total_bets, mv.is_active;

-- Wallet performance view
CREATE OR REPLACE VIEW v_wallet_performance AS
SELECT 
  w.id,
  w.name,
  w.balance,
  w.initial_balance,
  w.total_profit,
  w.roi,
  w.total_bets,
  w.total_won,
  w.total_lost,
  w.win_rate,
  COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bets,
  SUM(CASE WHEN b.status = 'pending' THEN b.stake ELSE 0 END) as pending_amount
FROM wallets w
LEFT JOIN bets b ON w.id = b.wallet_id
GROUP BY w.id;

-- Recent bets with game details
CREATE OR REPLACE VIEW v_recent_bets AS
SELECT 
  b.id,
  b.wallet_id,
  b.bet_type,
  b.stake,
  b.odds,
  b.status,
  b.profit,
  b.placed_at,
  b.settled_at,
  g.date as game_date,
  g.league_key,
  t1.name as home_team,
  t2.name as away_team,
  g.home_goals,
  g.away_goals,
  p.confidence,
  p.model_version
FROM bets b
JOIN games g ON b.game_id = g.id
JOIN teams t1 ON g.home_team_id = t1.id
JOIN teams t2 ON g.away_team_id = t2.id
LEFT JOIN predictions p ON b.prediction_id = p.id
ORDER BY b.placed_at DESC;

-- ================================================
-- 7. FUNCTIONS & TRIGGERS
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_versions_updated_at BEFORE UPDATE ON model_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update wallet statistics after bet settlement
CREATE OR REPLACE FUNCTION update_wallet_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('won', 'lost') AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
    UPDATE wallets
    SET 
      balance = balance + COALESCE(NEW.profit, 0),
      total_profit = total_profit + COALESCE(NEW.profit, 0),
      total_bets = total_bets + 1,
      total_won = total_won + CASE WHEN NEW.status = 'won' THEN 1 ELSE 0 END,
      total_lost = total_lost + CASE WHEN NEW.status = 'lost' THEN 1 ELSE 0 END,
      win_rate = CASE 
        WHEN (total_bets + 1) > 0 
        THEN ((total_won + CASE WHEN NEW.status = 'won' THEN 1 ELSE 0 END)::NUMERIC / (total_bets + 1)) * 100 
        ELSE 0 
      END,
      roi = CASE 
        WHEN initial_balance > 0 
        THEN ((total_profit + COALESCE(NEW.profit, 0)) / initial_balance) * 100 
        ELSE 0 
      END,
      updated_at = NOW()
    WHERE id = NEW.wallet_id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_wallet_on_bet_settlement
  AFTER INSERT OR UPDATE ON bets
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_stats();

-- ================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ================================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policies for read access (public can read most data)
CREATE POLICY "Public read access for teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read access for games" ON games FOR SELECT USING (true);
CREATE POLICY "Public read access for predictions" ON predictions FOR SELECT USING (true);
CREATE POLICY "Public read access for model_versions" ON model_versions FOR SELECT USING (true);

-- Policies for authenticated users
CREATE POLICY "Authenticated users can read wallets" ON wallets FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read bets" ON bets FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Admin-only policies for writes
CREATE POLICY "Admins can insert/update teams" ON teams FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can insert/update games" ON games FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can insert/update predictions" ON predictions FOR ALL 
  USING (auth.jwt() ->> 'role' = 'admin');

-- ================================================
-- 9. INITIAL DATA
-- ================================================

-- Insert default wallet
INSERT INTO wallets (name, balance, initial_balance)
VALUES ('Main Wallet', 1000.00, 1000.00)
ON CONFLICT DO NOTHING;

-- Insert v11 model version
INSERT INTO model_versions (
  version, name, description, accuracy, roi, is_active, notes
) VALUES (
  'v11',
  'V11 Ensemble Model',
  'XGBoost + LightGBM + CatBoost ensemble with 30 features',
  56.95,
  19.68,
  TRUE,
  'Production-ready model with proven performance'
) ON CONFLICT (version) DO NOTHING;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
-- Next steps:
-- 1. Run this schema in Supabase SQL Editor
-- 2. Update .env with Supabase credentials
-- 3. Migrate data from Turso using migration script
-- 4. Test frontend connections
-- 5. Deploy ML services with Supabase client
