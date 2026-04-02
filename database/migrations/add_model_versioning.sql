-- ================================================
-- PREDICTION MODEL VERSIONING SYSTEM
-- ================================================
-- Purpose: Track different model versions and compare performance
-- Date: January 17, 2026

-- ================================================
-- 1. Add version tracking to existing predictions
-- ================================================

-- Add model_version column to predictions table
ALTER TABLE predictions ADD COLUMN model_version TEXT DEFAULT 'v1.0';

-- Add model details for analysis
ALTER TABLE predictions ADD COLUMN model_details TEXT; -- JSON with weights, features used

-- Add probability outputs for better analysis
ALTER TABLE predictions ADD COLUMN home_win_prob INTEGER;
ALTER TABLE predictions ADD COLUMN draw_prob INTEGER;
ALTER TABLE predictions ADD COLUMN away_win_prob INTEGER;
ALTER TABLE predictions ADD COLUMN over25_prob INTEGER;
ALTER TABLE predictions ADD COLUMN btts_prob INTEGER;

-- Add odds used (for comparison with predictions)
ALTER TABLE predictions ADD COLUMN odds_home REAL;
ALTER TABLE predictions ADD COLUMN odds_draw REAL;
ALTER TABLE predictions ADD COLUMN odds_away REAL;

-- Add performance metrics
ALTER TABLE predictions ADD COLUMN expected_value REAL; -- EV from Kelly criterion
ALTER TABLE predictions ADD COLUMN brier_score REAL; -- Probability accuracy (lower is better)

-- ================================================
-- 2. Create model_versions table
-- ================================================

CREATE TABLE IF NOT EXISTS model_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Configuration
  features_used TEXT, -- JSON array: ["elo", "form", "goals", "odds", ...]
  ensemble_weights TEXT, -- JSON: {"elo": 0.22, "form": 0.18, ...}
  
  -- Performance metrics (calculated after backtest)
  accuracy REAL,
  home_accuracy REAL,
  draw_accuracy REAL,
  away_accuracy REAL,
  over25_accuracy REAL,
  btts_accuracy REAL,
  
  -- Probability calibration
  brier_score REAL, -- Lower is better (0 = perfect)
  log_loss REAL, -- Lower is better
  
  -- Betting performance
  roi REAL, -- Return on investment %
  win_rate REAL, -- % of winning bets
  avg_odds REAL, -- Average odds taken
  total_bets INTEGER,
  profitable_bets INTEGER,
  
  -- Training info
  trained_on TEXT, -- "2024-2025 season, 1566 games"
  tested_on TEXT, -- "2025-2026 season, 1015 games"
  training_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Status
  is_active INTEGER DEFAULT 0, -- Only one active version
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- 3. Insert baseline model (current model)
-- ================================================

INSERT INTO model_versions (
  version,
  name,
  description,
  features_used,
  ensemble_weights,
  accuracy,
  roi,
  trained_on,
  is_active,
  notes
) VALUES (
  'v1.0',
  'Baseline Ensemble (No Odds)',
  '9-model ensemble: Elo, Form, Goals, Possession, Corners, Discipline, Fixture, H2H, xG',
  '["elo", "form", "goals", "possession", "corners", "discipline", "fixture", "h2h", "xg"]',
  '{"elo": 0.26, "form": 0.20, "goals": 0.17, "possession": 0.12, "corners": 0.09, "discipline": 0.08, "fixture": 0.04, "h2h": 0.03, "xg": 0.01}',
  50.7,
  7.01,
  'Multiple seasons, ~2500 games',
  0,
  'Original model trained on smaller dataset. Accuracy: 50.7%, ROI: 7.01%'
);

-- ================================================
-- 4. Create comparison view
-- ================================================

CREATE VIEW IF NOT EXISTS model_comparison AS
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
  SUM(CASE WHEN p.result_correct = 1 THEN 1 ELSE 0 END) as correct_predictions,
  AVG(p.confidence) as avg_confidence,
  AVG(p.brier_score) as actual_brier_score
FROM model_versions mv
LEFT JOIN predictions p ON p.model_version = mv.version
GROUP BY mv.version, mv.name, mv.accuracy, mv.roi, mv.win_rate, 
         mv.brier_score, mv.total_bets, mv.is_active;

-- ================================================
-- 5. Create detailed comparison view
-- ================================================

CREATE VIEW IF NOT EXISTS model_head_to_head AS
SELECT 
  g.id as game_id,
  g.league_key,
  g.date,
  g.home_team_id,
  g.away_team_id,
  g.home_goals,
  g.away_goals,
  
  -- Model v1.0
  p1.prediction as v1_prediction,
  p1.confidence as v1_confidence,
  p1.result_correct as v1_correct,
  
  -- Model v2.0 (with odds)
  p2.prediction as v2_prediction,
  p2.confidence as v2_confidence,
  p2.result_correct as v2_correct,
  
  -- Comparison
  CASE 
    WHEN p1.result_correct = 1 AND p2.result_correct = 0 THEN 'v1_wins'
    WHEN p1.result_correct = 0 AND p2.result_correct = 1 THEN 'v2_wins'
    WHEN p1.result_correct = 1 AND p2.result_correct = 1 THEN 'both_correct'
    WHEN p1.result_correct = 0 AND p2.result_correct = 0 THEN 'both_wrong'
    ELSE 'incomplete'
  END as comparison
  
FROM games g
LEFT JOIN predictions p1 ON g.id = p1.game_id AND p1.model_version = 'v1.0'
LEFT JOIN predictions p2 ON g.id = p2.game_id AND p2.model_version = 'v2.0'
WHERE g.status = 'completed' AND g.home_goals IS NOT NULL;

-- ================================================
-- 6. Performance tracking queries
-- ================================================

-- Query 1: Overall comparison
-- SELECT * FROM model_comparison ORDER BY accuracy DESC;

-- Query 2: Head-to-head wins
-- SELECT 
--   comparison,
--   COUNT(*) as games,
--   ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
-- FROM model_head_to_head
-- WHERE comparison != 'incomplete'
-- GROUP BY comparison;

-- Query 3: League-specific performance
-- SELECT 
--   league_key,
--   SUM(CASE WHEN v1_correct = 1 THEN 1 ELSE 0 END) as v1_correct,
--   SUM(CASE WHEN v2_correct = 1 THEN 1 ELSE 0 END) as v2_correct,
--   COUNT(*) as total_games
-- FROM model_head_to_head
-- WHERE v1_correct IS NOT NULL AND v2_correct IS NOT NULL
-- GROUP BY league_key;

-- Query 4: Improvement by confidence level
-- SELECT 
--   CASE 
--     WHEN p.confidence < 50 THEN 'Low (< 50%)'
--     WHEN p.confidence < 60 THEN 'Medium (50-60%)'
--     WHEN p.confidence < 70 THEN 'High (60-70%)'
--     ELSE 'Very High (70%+)'
--   END as confidence_level,
--   p.model_version,
--   COUNT(*) as predictions,
--   AVG(CASE WHEN p.result_correct = 1 THEN 1.0 ELSE 0.0 END) as accuracy
-- FROM predictions p
-- WHERE p.result_correct IS NOT NULL
-- GROUP BY confidence_level, p.model_version
-- ORDER BY p.model_version, confidence_level;

-- ================================================
-- 7. Activate new model (run after v2.0 is better)
-- ================================================

-- UPDATE model_versions SET is_active = 0; -- Deactivate all
-- UPDATE model_versions SET is_active = 1 WHERE version = 'v2.0'; -- Activate v2.0
