-- ================================================
-- ESSENTIAL: League Season Validation
-- ================================================
-- Date: January 28, 2026
-- Purpose: Simple validation to check if league/season data is ready

-- ================================================
-- MAIN VALIDATION FUNCTION
-- ================================================

CREATE OR REPLACE FUNCTION validate_league_season(
  p_league_key TEXT,
  p_season TEXT DEFAULT '2025-2026'
)
RETURNS TABLE (
  validation_item TEXT,
  status TEXT,
  current_value TEXT,
  expected_value TEXT,
  percentage NUMERIC,
  is_ready BOOLEAN
) AS $$
DECLARE
  total_games INTEGER;
  expected_rounds INTEGER;
  teams_count INTEGER;
BEGIN
  -- Get total games for this league/season
  SELECT COUNT(*) INTO total_games
  FROM games
  WHERE league_key = p_league_key AND season = p_season;
  
  -- Get number of teams
  SELECT COUNT(DISTINCT home_team_id) INTO teams_count
  FROM games
  WHERE league_key = p_league_key AND season = p_season;
  
  -- Calculate expected rounds (each team plays others twice)
  expected_rounds := CASE 
    WHEN teams_count > 0 THEN (teams_count - 1) * 2
    ELSE 38  -- Default for most leagues
  END;
  
  -- 1. Total Games Check
  RETURN QUERY
  SELECT 
    'Total Games'::TEXT,
    CASE WHEN total_games >= (teams_count * (teams_count - 1)) THEN 'GOOD' ELSE 'NEEDS ATTENTION' END::TEXT,
    total_games::TEXT,
    (teams_count * (teams_count - 1))::TEXT as expected,
    CASE 
      WHEN teams_count > 0 THEN ROUND(100.0 * total_games / (teams_count * (teams_count - 1)), 1)
      ELSE 0 
    END,
    total_games >= (teams_count * (teams_count - 1) * 0.8);  -- 80% threshold
  
  -- 2. Games with Flashscore URLs
  RETURN QUERY
  SELECT 
    'Has Flashscore URL'::TEXT,
    CASE 
      WHEN COUNT(*) FILTER (WHERE flashscore_url IS NOT NULL) >= total_games * 0.9 THEN 'GOOD'
      WHEN COUNT(*) FILTER (WHERE flashscore_url IS NOT NULL) >= total_games * 0.7 THEN 'NEEDS WORK'
      ELSE 'CRITICAL'
    END::TEXT,
    COUNT(*) FILTER (WHERE flashscore_url IS NOT NULL)::TEXT,
    total_games::TEXT,
    ROUND(100.0 * COUNT(*) FILTER (WHERE flashscore_url IS NOT NULL) / NULLIF(total_games, 0), 1),
    (COUNT(*) FILTER (WHERE flashscore_url IS NOT NULL)::NUMERIC >= total_games * 0.9)
  FROM games
  WHERE league_key = p_league_key AND season = p_season;
  
  -- 3. Games Scraped
  RETURN QUERY
  SELECT 
    'Is Scraped'::TEXT,
    CASE 
      WHEN COUNT(*) FILTER (WHERE is_scraped = TRUE) >= total_games * 0.9 THEN 'GOOD'
      WHEN COUNT(*) FILTER (WHERE is_scraped = TRUE) >= total_games * 0.7 THEN 'NEEDS WORK'
      ELSE 'CRITICAL'
    END::TEXT,
    COUNT(*) FILTER (WHERE is_scraped = TRUE)::TEXT,
    total_games::TEXT,
    ROUND(100.0 * COUNT(*) FILTER (WHERE is_scraped = TRUE) / NULLIF(total_games, 0), 1),
    (COUNT(*) FILTER (WHERE is_scraped = TRUE)::NUMERIC >= total_games * 0.9)
  FROM games
  WHERE league_key = p_league_key AND season = p_season;
  
  -- 4. Games with xG Data
  RETURN QUERY
  SELECT 
    'Has xG Data'::TEXT,
    CASE 
      WHEN COUNT(*) FILTER (WHERE home_xg IS NOT NULL) >= total_games * 0.7 THEN 'GOOD'
      WHEN COUNT(*) FILTER (WHERE home_xg IS NOT NULL) >= total_games * 0.5 THEN 'NEEDS WORK'
      ELSE 'CRITICAL'
    END::TEXT,
    COUNT(*) FILTER (WHERE home_xg IS NOT NULL)::TEXT,
    total_games::TEXT,
    ROUND(100.0 * COUNT(*) FILTER (WHERE home_xg IS NOT NULL) / NULLIF(total_games, 0), 1),
    (COUNT(*) FILTER (WHERE home_xg IS NOT NULL)::NUMERIC >= total_games * 0.7)
  FROM games
  WHERE league_key = p_league_key AND season = p_season;
  
  -- 5. Games with Lineups
  RETURN QUERY
  SELECT 
    'Has Lineups'::TEXT,
    CASE 
      WHEN COUNT(DISTINCT g.id) FILTER (WHERE EXISTS(SELECT 1 FROM lineups l WHERE l.game_id = g.id)) >= total_games * 0.7 THEN 'GOOD'
      WHEN COUNT(DISTINCT g.id) FILTER (WHERE EXISTS(SELECT 1 FROM lineups l WHERE l.game_id = g.id)) >= total_games * 0.5 THEN 'NEEDS WORK'
      ELSE 'CRITICAL'
    END::TEXT,
    COUNT(DISTINCT g.id) FILTER (WHERE EXISTS(SELECT 1 FROM lineups l WHERE l.game_id = g.id))::TEXT,
    total_games::TEXT,
    ROUND(100.0 * COUNT(DISTINCT g.id) FILTER (WHERE EXISTS(SELECT 1 FROM lineups l WHERE l.game_id = g.id)) / NULLIF(total_games, 0), 1),
    (COUNT(DISTINCT g.id) FILTER (WHERE EXISTS(SELECT 1 FROM lineups l WHERE l.game_id = g.id))::NUMERIC >= total_games * 0.7)
  FROM games g
  WHERE league_key = p_league_key AND season = p_season;
  
  -- 6. Games with Odds
  RETURN QUERY
  SELECT 
    'Has Odds'::TEXT,
    CASE 
      WHEN COUNT(*) FILTER (WHERE odds_home IS NOT NULL) >= total_games * 0.7 THEN 'GOOD'
      WHEN COUNT(*) FILTER (WHERE odds_home IS NOT NULL) >= total_games * 0.5 THEN 'NEEDS WORK'
      ELSE 'CRITICAL'
    END::TEXT,
    COUNT(*) FILTER (WHERE odds_home IS NOT NULL)::TEXT,
    total_games::TEXT,
    ROUND(100.0 * COUNT(*) FILTER (WHERE odds_home IS NOT NULL) / NULLIF(total_games, 0), 1),
    (COUNT(*) FILTER (WHERE odds_home IS NOT NULL)::NUMERIC >= total_games * 0.7)
  FROM games
  WHERE league_key = p_league_key AND season = p_season;
  
  -- 7. Games with Results (completed games)
  RETURN QUERY
  SELECT 
    'Has Results'::TEXT,
    CASE 
      WHEN COUNT(*) FILTER (WHERE home_goals IS NOT NULL) >= total_games * 0.5 THEN 'GOOD'
      WHEN COUNT(*) FILTER (WHERE home_goals IS NOT NULL) >= total_games * 0.3 THEN 'NEEDS WORK'
      ELSE 'CRITICAL'
    END::TEXT,
    COUNT(*) FILTER (WHERE home_goals IS NOT NULL)::TEXT,
    total_games::TEXT,
    ROUND(100.0 * COUNT(*) FILTER (WHERE home_goals IS NOT NULL) / NULLIF(total_games, 0), 1),
    (COUNT(*) FILTER (WHERE home_goals IS NOT NULL)::NUMERIC >= total_games * 0.3)
  FROM games
  WHERE league_key = p_league_key AND season = p_season;
  
  -- 8. Overall ML Readiness (games ready for training)
  RETURN QUERY
  SELECT 
    '✨ ML Training Ready'::TEXT,
    CASE 
      WHEN COUNT(*) FILTER (
        WHERE home_goals IS NOT NULL 
        AND home_xg IS NOT NULL 
        AND odds_home IS NOT NULL
      ) >= total_games * 0.5 THEN 'READY ✅'
      ELSE 'NOT READY ❌'
    END::TEXT,
    COUNT(*) FILTER (
      WHERE home_goals IS NOT NULL 
      AND home_xg IS NOT NULL 
      AND odds_home IS NOT NULL
    )::TEXT,
    total_games::TEXT,
    ROUND(100.0 * COUNT(*) FILTER (
      WHERE home_goals IS NOT NULL 
      AND home_xg IS NOT NULL 
      AND odds_home IS NOT NULL
    ) / NULLIF(total_games, 0), 1),
    (COUNT(*) FILTER (
      WHERE home_goals IS NOT NULL 
      AND home_xg IS NOT NULL 
      AND odds_home IS NOT NULL
    )::NUMERIC >= total_games * 0.5)
  FROM games
  WHERE league_key = p_league_key AND season = p_season;
  
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- QUICK CHECK: All Leagues Summary
-- ================================================

CREATE OR REPLACE FUNCTION validate_all_leagues(
  p_season TEXT DEFAULT '2025-2026'
)
RETURNS TABLE (
  league_key TEXT,
  total_games BIGINT,
  scraped_pct NUMERIC,
  xg_pct NUMERIC,
  lineups_pct NUMERIC,
  ml_ready_pct NUMERIC,
  overall_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.league_key,
    COUNT(*) as total_games,
    ROUND(100.0 * COUNT(*) FILTER (WHERE g.is_scraped = TRUE) / COUNT(*), 1) as scraped_pct,
    ROUND(100.0 * COUNT(*) FILTER (WHERE g.home_xg IS NOT NULL) / COUNT(*), 1) as xg_pct,
    ROUND(100.0 * COUNT(DISTINCT g.id) FILTER (WHERE EXISTS(SELECT 1 FROM lineups l WHERE l.game_id = g.id)) / COUNT(*), 1) as lineups_pct,
    ROUND(100.0 * COUNT(*) FILTER (WHERE g.home_goals IS NOT NULL AND g.home_xg IS NOT NULL AND g.odds_home IS NOT NULL) / COUNT(*), 1) as ml_ready_pct,
    CASE 
      WHEN ROUND(100.0 * COUNT(*) FILTER (WHERE g.home_goals IS NOT NULL AND g.home_xg IS NOT NULL AND g.odds_home IS NOT NULL) / COUNT(*), 1) >= 70 THEN '✅ EXCELLENT'
      WHEN ROUND(100.0 * COUNT(*) FILTER (WHERE g.home_goals IS NOT NULL AND g.home_xg IS NOT NULL AND g.odds_home IS NOT NULL) / COUNT(*), 1) >= 50 THEN '⚠️  GOOD'
      WHEN ROUND(100.0 * COUNT(*) FILTER (WHERE g.home_goals IS NOT NULL AND g.home_xg IS NOT NULL AND g.odds_home IS NOT NULL) / COUNT(*), 1) >= 30 THEN '⚠️  NEEDS WORK'
      ELSE '❌ CRITICAL'
    END as overall_status
  FROM games g
  WHERE g.season = p_season
  GROUP BY g.league_key
  ORDER BY ml_ready_pct DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- USAGE EXAMPLES
-- ================================================

-- Validate specific league
-- SELECT * FROM validate_league_season('premier_league', '2025-2026');

-- Quick check all leagues
-- SELECT * FROM validate_all_leagues('2025-2026');

-- Check which leagues are ML-ready
-- SELECT league_key, ml_ready_pct, overall_status 
-- FROM validate_all_leagues('2025-2026') 
-- WHERE ml_ready_pct >= 50;
