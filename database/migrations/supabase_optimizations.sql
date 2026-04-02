-- ================================================
-- SUPABASE OPTIMIZATIONS & HELPER FUNCTIONS
-- ================================================
-- Date: January 27, 2026
-- Purpose: Advanced database functions for duplicate detection,
--          data validation, and automated maintenance

-- ================================================
-- 1. DUPLICATE DETECTION & CLEANUP
-- ================================================

-- Function to find duplicate games
CREATE OR REPLACE FUNCTION find_duplicate_games()
RETURNS TABLE (
  game_id_1 BIGINT,
  game_id_2 BIGINT,
  home_team_id BIGINT,
  away_team_id BIGINT,
  match_date TIMESTAMP WITH TIME ZONE,
  league_key TEXT,
  season TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g1.id as game_id_1,
    g2.id as game_id_2,
    g1.home_team_id,
    g1.away_team_id,
    g1.date as match_date,
    g1.league_key,
    g1.season
  FROM games g1
  JOIN games g2 ON 
    g1.home_team_id = g2.home_team_id
    AND g1.away_team_id = g2.away_team_id
    AND DATE(g1.date) = DATE(g2.date)
    AND g1.id < g2.id  -- Avoid duplicate pairs
  ORDER BY g1.date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to remove duplicate games (keeps the one with more data)
CREATE OR REPLACE FUNCTION remove_duplicate_games()
RETURNS TABLE (
  deleted_game_id BIGINT,
  kept_game_id BIGINT
) AS $$
DECLARE
  dup RECORD;
  game1_data_score INTEGER;
  game2_data_score INTEGER;
  id_to_delete BIGINT;
  id_to_keep BIGINT;
BEGIN
  FOR dup IN SELECT * FROM find_duplicate_games() LOOP
    -- Score games based on how much data they have
    SELECT 
      (CASE WHEN home_goals IS NOT NULL THEN 10 ELSE 0 END) +
      (CASE WHEN home_xg IS NOT NULL THEN 5 ELSE 0 END) +
      (CASE WHEN flashscore_url IS NOT NULL THEN 5 ELSE 0 END) +
      (CASE WHEN is_scraped = TRUE THEN 20 ELSE 0 END) +
      (CASE WHEN home_shots IS NOT NULL THEN 5 ELSE 0 END) +
      (CASE WHEN match_events IS NOT NULL THEN 10 ELSE 0 END)
    INTO game1_data_score
    FROM games WHERE id = dup.game_id_1;
    
    SELECT 
      (CASE WHEN home_goals IS NOT NULL THEN 10 ELSE 0 END) +
      (CASE WHEN home_xg IS NOT NULL THEN 5 ELSE 0 END) +
      (CASE WHEN flashscore_url IS NOT NULL THEN 5 ELSE 0 END) +
      (CASE WHEN is_scraped = TRUE THEN 20 ELSE 0 END) +
      (CASE WHEN home_shots IS NOT NULL THEN 5 ELSE 0 END) +
      (CASE WHEN match_events IS NOT NULL THEN 10 ELSE 0 END)
    INTO game2_data_score
    FROM games WHERE id = dup.game_id_2;
    
    -- Keep the game with more data
    IF game1_data_score >= game2_data_score THEN
      id_to_delete := dup.game_id_2;
      id_to_keep := dup.game_id_1;
    ELSE
      id_to_delete := dup.game_id_1;
      id_to_keep := dup.game_id_2;
    END IF;
    
    -- Delete the duplicate (cascading will handle related records)
    DELETE FROM games WHERE id = id_to_delete;
    
    deleted_game_id := id_to_delete;
    kept_game_id := id_to_keep;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 2. MISSING GAMES DETECTION
-- ================================================

-- Function to find missing games in a league/season
CREATE OR REPLACE FUNCTION find_missing_games(
  p_league_key TEXT,
  p_season TEXT
)
RETURNS TABLE (
  expected_round INTEGER,
  games_in_round BIGINT,
  expected_games INTEGER,
  missing_count INTEGER
) AS $$
DECLARE
  teams_count INTEGER;
  games_per_round INTEGER;
BEGIN
  -- Count teams in this league
  SELECT COUNT(DISTINCT home_team_id)
  INTO teams_count
  FROM games
  WHERE league_key = p_league_key
    AND season = p_season;
  
  -- Calculate expected games per round (each team plays once per round)
  games_per_round := teams_count / 2;
  
  RETURN QUERY
  SELECT 
    r.round_num as expected_round,
    COUNT(g.id) as games_in_round,
    games_per_round as expected_games,
    (games_per_round - COUNT(g.id))::INTEGER as missing_count
  FROM generate_series(1, 38) as r(round_num)  -- Adjust max rounds as needed
  LEFT JOIN games g ON 
    g.round = r.round_num
    AND g.league_key = p_league_key
    AND g.season = p_season
  GROUP BY r.round_num, games_per_round
  HAVING COUNT(g.id) < games_per_round
  ORDER BY r.round_num;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 3. DATA QUALITY CHECKS
-- ================================================

-- Function to check games missing Flashscore URLs
CREATE OR REPLACE FUNCTION games_missing_flashscore_urls(
  p_league_key TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  game_id BIGINT,
  home_team TEXT,
  away_team TEXT,
  match_date TIMESTAMP WITH TIME ZONE,
  league_key TEXT,
  round INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id as game_id,
    t1.name as home_team,
    t2.name as away_team,
    g.date as match_date,
    g.league_key,
    g.round,
    g.status
  FROM games g
  JOIN teams t1 ON g.home_team_id = t1.id
  JOIN teams t2 ON g.away_team_id = t2.id
  WHERE 
    (g.flashscore_url IS NULL OR g.flashscore_url = '')
    AND (p_league_key IS NULL OR g.league_key = p_league_key)
    AND g.status = 'completed'
  ORDER BY g.date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to check games with incomplete scraping
CREATE OR REPLACE FUNCTION games_incomplete_scraping(
  p_league_key TEXT DEFAULT NULL
)
RETURNS TABLE (
  game_id BIGINT,
  home_team TEXT,
  away_team TEXT,
  match_date TIMESTAMP WITH TIME ZONE,
  league_key TEXT,
  has_url BOOLEAN,
  is_scraped BOOLEAN,
  has_lineups BOOLEAN,
  has_odds BOOLEAN,
  has_stats BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id as game_id,
    t1.name as home_team,
    t2.name as away_team,
    g.date as match_date,
    g.league_key,
    (g.flashscore_url IS NOT NULL AND g.flashscore_url != '') as has_url,
    COALESCE(g.is_scraped, FALSE) as is_scraped,
    EXISTS(SELECT 1 FROM lineups l WHERE l.game_id = g.id LIMIT 1) as has_lineups,
    (g.odds_home IS NOT NULL) as has_odds,
    (g.home_shots IS NOT NULL OR g.home_xg IS NOT NULL) as has_stats
  FROM games g
  JOIN teams t1 ON g.home_team_id = t1.id
  JOIN teams t2 ON g.away_team_id = t2.id
  WHERE 
    (p_league_key IS NULL OR g.league_key = p_league_key)
    AND g.status = 'completed'
    AND (
      g.is_scraped = FALSE 
      OR g.flashscore_url IS NULL
      OR NOT EXISTS(SELECT 1 FROM lineups l WHERE l.game_id = g.id LIMIT 1)
    )
  ORDER BY g.date DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 4. LEAGUE STATISTICS & ANALYTICS
-- ================================================

-- Function to get league data completeness stats
CREATE OR REPLACE FUNCTION league_data_completeness(
  p_league_key TEXT,
  p_season TEXT
)
RETURNS TABLE (
  metric TEXT,
  total_games BIGINT,
  count_with_data BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'Total Games'::TEXT, COUNT(*)::BIGINT, COUNT(*)::BIGINT, 100.0::NUMERIC
  FROM games WHERE league_key = p_league_key AND season = p_season
  UNION ALL
  SELECT 'Has Flashscore URL', COUNT(*), COUNT(*) FILTER (WHERE flashscore_url IS NOT NULL AND flashscore_url != ''), 
    ROUND(100.0 * COUNT(*) FILTER (WHERE flashscore_url IS NOT NULL AND flashscore_url != '') / NULLIF(COUNT(*), 0), 2)
  FROM games WHERE league_key = p_league_key AND season = p_season
  UNION ALL
  SELECT 'Is Scraped', COUNT(*), COUNT(*) FILTER (WHERE is_scraped = TRUE), 
    ROUND(100.0 * COUNT(*) FILTER (WHERE is_scraped = TRUE) / NULLIF(COUNT(*), 0), 2)
  FROM games WHERE league_key = p_league_key AND season = p_season
  UNION ALL
  SELECT 'Has Results', COUNT(*), COUNT(*) FILTER (WHERE home_goals IS NOT NULL), 
    ROUND(100.0 * COUNT(*) FILTER (WHERE home_goals IS NOT NULL) / NULLIF(COUNT(*), 0), 2)
  FROM games WHERE league_key = p_league_key AND season = p_season
  UNION ALL
  SELECT 'Has xG Data', COUNT(*), COUNT(*) FILTER (WHERE home_xg IS NOT NULL), 
    ROUND(100.0 * COUNT(*) FILTER (WHERE home_xg IS NOT NULL) / NULLIF(COUNT(*), 0), 2)
  FROM games WHERE league_key = p_league_key AND season = p_season
  UNION ALL
  SELECT 'Has Odds', COUNT(*), COUNT(*) FILTER (WHERE odds_home IS NOT NULL), 
    ROUND(100.0 * COUNT(*) FILTER (WHERE odds_home IS NOT NULL) / NULLIF(COUNT(*), 0), 2)
  FROM games WHERE league_key = p_league_key AND season = p_season
  UNION ALL
  SELECT 'Has Lineups', COUNT(*), 
    COUNT(DISTINCT g.id) FILTER (WHERE EXISTS(SELECT 1 FROM lineups l WHERE l.game_id = g.id LIMIT 1)), 
    ROUND(100.0 * COUNT(DISTINCT g.id) FILTER (WHERE EXISTS(SELECT 1 FROM lineups l WHERE l.game_id = g.id LIMIT 1)) / NULLIF(COUNT(*), 0), 2)
  FROM games g WHERE league_key = p_league_key AND season = p_season
  UNION ALL
  SELECT 'Has Referee', COUNT(*), COUNT(*) FILTER (WHERE referee_name IS NOT NULL), 
    ROUND(100.0 * COUNT(*) FILTER (WHERE referee_name IS NOT NULL) / NULLIF(COUNT(*), 0), 2)
  FROM games WHERE league_key = p_league_key AND season = p_season;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 5. AUTOMATED MAINTENANCE
-- ================================================

-- Function to update game status based on date
CREATE OR REPLACE FUNCTION update_game_status()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Mark past games without results as postponed
  UPDATE games
  SET status = 'postponed'
  WHERE date < NOW() - INTERVAL '2 days'
    AND status = 'scheduled'
    AND home_goals IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Mark games with results as completed
  UPDATE games
  SET status = 'completed'
  WHERE home_goals IS NOT NULL
    AND status != 'completed';
  
  GET DIAGNOSTICS updated_count = updated_count + ROW_COUNT;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to estimate missing xG data from shots
CREATE OR REPLACE FUNCTION estimate_missing_xg()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE games
  SET 
    home_xg = CASE 
      WHEN home_xg IS NULL AND home_shots_on_target IS NOT NULL 
      THEN home_shots_on_target * 0.15 + COALESCE(home_big_chances, 0) * 0.4
      ELSE home_xg
    END,
    away_xg = CASE 
      WHEN away_xg IS NULL AND away_shots_on_target IS NOT NULL 
      THEN away_shots_on_target * 0.15 + COALESCE(away_big_chances, 0) * 0.4
      ELSE away_xg
    END,
    xg_estimated = TRUE
  WHERE (home_xg IS NULL OR away_xg IS NULL)
    AND home_shots_on_target IS NOT NULL
    AND away_shots_on_target IS NOT NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 6. UNIQUE CONSTRAINTS
-- ================================================

-- Add unique constraint to prevent duplicate games
-- (home_team, away_team, date should be unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_games_unique_match 
ON games (home_team_id, away_team_id, DATE(date), league_key, season);

-- ================================================
-- 7. VIEWS FOR DATA QUALITY MONITORING
-- ================================================

-- View for overall data quality dashboard
CREATE OR REPLACE VIEW v_data_quality_summary AS
SELECT 
  league_key,
  season,
  COUNT(*) as total_games,
  COUNT(*) FILTER (WHERE flashscore_url IS NOT NULL AND flashscore_url != '') as has_url,
  COUNT(*) FILTER (WHERE is_scraped = TRUE) as scraped,
  COUNT(*) FILTER (WHERE home_goals IS NOT NULL) as has_results,
  COUNT(*) FILTER (WHERE home_xg IS NOT NULL) as has_xg,
  COUNT(*) FILTER (WHERE odds_home IS NOT NULL) as has_odds,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_scraped = TRUE) / NULLIF(COUNT(*), 0), 2) as scraping_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE home_xg IS NOT NULL) / NULLIF(COUNT(*), 0), 2) as xg_pct
FROM games
GROUP BY league_key, season
ORDER BY league_key, season DESC;

-- View for games ready for ML training
CREATE OR REPLACE VIEW v_ml_ready_games AS
SELECT 
  g.id,
  g.league_key,
  g.season,
  g.round,
  g.date,
  t1.name as home_team,
  t2.name as away_team,
  g.home_goals,
  g.away_goals,
  g.home_xg,
  g.away_xg,
  g.is_scraped,
  EXISTS(SELECT 1 FROM lineups l WHERE l.game_id = g.id LIMIT 1) as has_lineups,
  (g.odds_home IS NOT NULL) as has_odds
FROM games g
JOIN teams t1 ON g.home_team_id = t1.id
JOIN teams t2 ON g.away_team_id = t2.id
WHERE 
  g.status = 'completed'
  AND g.home_goals IS NOT NULL
  AND g.home_xg IS NOT NULL
  AND g.odds_home IS NOT NULL
ORDER BY g.date DESC;

-- ================================================
-- 8. POSTGRES EXTENSIONS
-- ================================================

-- Enable useful PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- Fuzzy text search
CREATE EXTENSION IF NOT EXISTS btree_gin;  -- Better indexing for JSONB
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;  -- Query performance tracking

-- ================================================
-- USAGE EXAMPLES
-- ================================================

-- Find all duplicates:
-- SELECT * FROM find_duplicate_games();

-- Remove duplicates (keeps game with most data):
-- SELECT * FROM remove_duplicate_games();

-- Check missing games in Premier League:
-- SELECT * FROM find_missing_games('premier_league', '2025-2026');

-- Check data completeness for a league:
-- SELECT * FROM league_data_completeness('premier_league', '2025-2026');

-- Find games missing Flashscore URLs:
-- SELECT * FROM games_missing_flashscore_urls('premier_league', 50);

-- Find games with incomplete scraping:
-- SELECT * FROM games_incomplete_scraping('premier_league');

-- Update game statuses automatically:
-- SELECT update_game_status();

-- Estimate missing xG data:
-- SELECT estimate_missing_xg();

-- View overall data quality:
-- SELECT * FROM v_data_quality_summary;

-- View games ready for ML:
-- SELECT * FROM v_ml_ready_games LIMIT 100;
