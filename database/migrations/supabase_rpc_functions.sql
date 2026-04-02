-- ================================================
-- SUPABASE RPC FUNCTIONS MIGRATION
-- ================================================
-- Purpose: Add PostgreSQL functions needed by protero-tools
-- Date: February 1, 2026
-- Required by: bin/db-maintenance.js
-- Safe: Uses CREATE OR REPLACE to prevent duplication

-- ================================================
-- 1. FIND DUPLICATE GAMES
-- ================================================

DROP FUNCTION IF EXISTS find_duplicate_games();
CREATE OR REPLACE FUNCTION find_duplicate_games()
RETURNS TABLE (
  home_team TEXT,
  away_team TEXT,
  date TIMESTAMP WITH TIME ZONE,
  league_key TEXT,
  season TEXT,
  count BIGINT,
  game_ids BIGINT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t1.name as home_team,
    t2.name as away_team,
    g.date,
    g.league_key,
    g.season,
    COUNT(*) as count,
    ARRAY_AGG(g.id ORDER BY g.id) as game_ids
  FROM games g
  JOIN teams t1 ON g.home_team_id = t1.id
  JOIN teams t2 ON g.away_team_id = t2.id
  GROUP BY t1.name, t2.name, g.date, g.league_key, g.season
  HAVING COUNT(*) > 1
  ORDER BY count DESC, g.date DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 2. REMOVE DUPLICATE GAMES
-- ================================================

DROP FUNCTION IF EXISTS remove_duplicate_games();
CREATE OR REPLACE FUNCTION remove_duplicate_games()
RETURNS TABLE (
  deleted_count BIGINT,
  kept_count BIGINT
) AS $$
DECLARE
  v_deleted_count BIGINT := 0;
  v_kept_count BIGINT := 0;
  v_game_ids BIGINT[];
  v_keep_id BIGINT;
BEGIN
  -- Find all duplicate groups
  FOR v_game_ids IN
    SELECT ARRAY_AGG(g.id ORDER BY g.id) as ids
    FROM games g
    JOIN teams t1 ON g.home_team_id = t1.id
    JOIN teams t2 ON g.away_team_id = t2.id
    GROUP BY t1.id, t2.id, g.date, g.league_key, g.season
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the first game (lowest ID), delete the rest
    v_keep_id := v_game_ids[1];
    
    DELETE FROM games 
    WHERE id = ANY(v_game_ids[2:]);
    
    v_deleted_count := v_deleted_count + array_length(v_game_ids, 1) - 1;
    v_kept_count := v_kept_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT v_deleted_count, v_kept_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 3. LEAGUE DATA COMPLETENESS
-- ================================================

DROP FUNCTION IF EXISTS league_data_completeness(TEXT, TEXT);
CREATE OR REPLACE FUNCTION league_data_completeness(
  p_league_key TEXT,
  p_season TEXT DEFAULT NULL
)
RETURNS TABLE (
  league_key TEXT,
  season TEXT,
  total_games BIGINT,
  completed_games BIGINT,
  scheduled_games BIGINT,
  games_with_xg BIGINT,
  games_with_possession BIGINT,
  games_with_lineups BIGINT,
  completeness_pct NUMERIC(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.league_key,
    g.season,
    COUNT(*) as total_games,
    COUNT(*) FILTER (WHERE g.status = 'completed') as completed_games,
    COUNT(*) FILTER (WHERE g.status = 'scheduled') as scheduled_games,
    COUNT(*) FILTER (WHERE g.home_xg IS NOT NULL AND g.away_xg IS NOT NULL) as games_with_xg,
    COUNT(*) FILTER (WHERE g.home_possession IS NOT NULL AND g.away_possession IS NOT NULL) as games_with_possession,
    COUNT(DISTINCT l.game_id) as games_with_lineups,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE 
          g.home_xg IS NOT NULL 
          AND g.away_xg IS NOT NULL 
          AND g.home_possession IS NOT NULL
        )::NUMERIC / COUNT(*)) * 100
      ELSE 0
    END as completeness_pct
  FROM games g
  LEFT JOIN lineups l ON g.id = l.game_id
  WHERE g.league_key = p_league_key
    AND (p_season IS NULL OR g.season = p_season)
  GROUP BY g.league_key, g.season
  ORDER BY g.season DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 4. GAMES MISSING FLASHSCORE URLS
-- ================================================

DROP FUNCTION IF EXISTS games_missing_flashscore_urls(TEXT, TEXT);
CREATE OR REPLACE FUNCTION games_missing_flashscore_urls(
  p_league_key TEXT DEFAULT NULL,
  p_season TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  home_team TEXT,
  away_team TEXT,
  date TIMESTAMP WITH TIME ZONE,
  league_key TEXT,
  season TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    t1.name as home_team,
    t2.name as away_team,
    g.date,
    g.league_key,
    g.season,
    g.status
  FROM games g
  JOIN teams t1 ON g.home_team_id = t1.id
  JOIN teams t2 ON g.away_team_id = t2.id
  WHERE (g.flashscore_url IS NULL OR g.flashscore_url = '')
    AND (p_league_key IS NULL OR g.league_key = p_league_key)
    AND (p_season IS NULL OR g.season = p_season)
  ORDER BY g.date DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 5. GAMES INCOMPLETE SCRAPING
-- ================================================
DROP FUNCTION IF EXISTS games_incomplete_scraping(TEXT, TEXT);

CREATE OR REPLACE FUNCTION games_incomplete_scraping(
  p_league_key TEXT DEFAULT NULL,
  p_season TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  home_team TEXT,
  away_team TEXT,
  date TIMESTAMP WITH TIME ZONE,
  league_key TEXT,
  season TEXT,
  missing_data TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    t1.name as home_team,
    t2.name as away_team,
    g.date,
    g.league_key,
    g.season,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN g.home_xg IS NULL THEN 'xG' END,
      CASE WHEN g.home_possession IS NULL THEN 'possession' END,
      CASE WHEN NOT EXISTS(SELECT 1 FROM lineups WHERE game_id = g.id) THEN 'lineups' END,
      CASE WHEN g.referee_id IS NULL THEN 'referee' END
    ], NULL) as missing_data
  FROM games g
  JOIN teams t1 ON g.home_team_id = t1.id
  JOIN teams t2 ON g.away_team_id = t2.id
  WHERE g.status = 'completed'
    AND (
      g.home_xg IS NULL 
      OR g.home_possession IS NULL
      OR NOT EXISTS(SELECT 1 FROM lineups WHERE game_id = g.id)
      OR g.referee_id IS NULL
    )
    AND (p_league_key IS NULL OR g.league_key = p_league_key)
    AND (p_season IS NULL OR g.season = p_season)
  ORDER BY g.date DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 6. UPDATE GAME STATUS
-- ================================================
DROP FUNCTION IF EXISTS update_game_status();

CREATE OR REPLACE FUNCTION update_game_status()
RETURNS TABLE (
  updated_count BIGINT
) AS $$
DECLARE
  v_count BIGINT;
BEGIN
  -- Update completed games (games in the past with scores)
  UPDATE games
  SET status = 'completed'
  WHERE status = 'scheduled'
    AND date < NOW()
    AND home_goals IS NOT NULL
    AND away_goals IS NOT NULL;
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 7. ESTIMATE MISSING XG
-- ================================================
DROP FUNCTION IF EXISTS estimate_missing_xg();

CREATE OR REPLACE FUNCTION estimate_missing_xg()
RETURNS TABLE (
  updated_count BIGINT
) AS $$
DECLARE
  v_count BIGINT := 0;
BEGIN
  -- Estimate xG based on shots on target (rough approximation)
  -- This is a placeholder - you should use actual xG data when available
  UPDATE games
  SET 
    home_xg = CASE 
      WHEN home_goals IS NOT NULL THEN home_goals * 1.2 
      ELSE NULL 
    END,
    away_xg = CASE 
      WHEN away_goals IS NOT NULL THEN away_goals * 1.2 
      ELSE NULL 
    END
  WHERE status = 'completed'
    AND home_xg IS NULL
    AND away_xg IS NULL
    AND home_goals IS NOT NULL
    AND away_goals IS NOT NULL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 8. VALIDATE LEAGUE SEASON
DROP FUNCTION IF EXISTS validate_league_season(TEXT, TEXT);
-- ================================================

CREATE OR REPLACE FUNCTION validate_league_season(
  p_league_key TEXT,
  p_season TEXT
)
RETURNS TABLE (
  total_games BIGINT,
  games_with_results BIGINT,
  games_without_results BIGINT,
  duplicate_games BIGINT,
  missing_teams BIGINT,
  validation_status TEXT
) AS $$
DECLARE
  v_total BIGINT;
  v_with_results BIGINT;
  v_duplicates BIGINT;
  v_missing_teams BIGINT;
BEGIN
  -- Count total games
  SELECT COUNT(*) INTO v_total
  FROM games
  WHERE league_key = p_league_key AND season = p_season;
  
  -- Count games with results
  SELECT COUNT(*) INTO v_with_results
  FROM games
  WHERE league_key = p_league_key 
    AND season = p_season
    AND home_goals IS NOT NULL 
    AND away_goals IS NOT NULL;
  
  -- Count duplicates
  SELECT COUNT(*) INTO v_duplicates
  FROM (
    SELECT COUNT(*) as cnt
    FROM games g
    GROUP BY g.home_team_id, g.away_team_id, g.date, g.league_key, g.season
    HAVING COUNT(*) > 1
  ) AS dups
  WHERE league_key = p_league_key AND season = p_season;
  
  -- Count missing teams (games with NULL team IDs)
  SELECT COUNT(*) INTO v_missing_teams
  FROM games
  WHERE league_key = p_league_key 
    AND season = p_season
    AND (home_team_id IS NULL OR away_team_id IS NULL);
  
  RETURN QUERY
  SELECT 
    v_total,
    v_with_results,
    v_total - v_with_results,
    v_duplicates,
    v_missing_teams,
    CASE 
      WHEN v_duplicates > 0 THEN 'Has duplicates'
      WHEN v_missing_teams > 0 THEN 'Has missing teams'
      WHEN v_with_results = 0 THEN 'No results'
      WHEN v_with_results::NUMERIC / v_total < 0.5 THEN 'Incomplete'
      ELSE 'OK'
    END;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 9. VALIDATE ALL LEAGUES
DROP FUNCTION IF EXISTS validate_all_leagues(TEXT);
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
    -- Scraped percentage (has results)
    CASE 
      WHEN COUNT(*) > 0 THEN
        (COUNT(*) FILTER (WHERE g.home_goals IS NOT NULL)::NUMERIC / COUNT(*)) * 100
      ELSE 0
    END as scraped_pct,
    -- xG percentage
    CASE 
      WHEN COUNT(*) > 0 THEN
        (COUNT(*) FILTER (WHERE g.home_xg IS NOT NULL)::NUMERIC / COUNT(*)) * 100
      ELSE 0
    END as xg_pct,
    -- Lineups percentage
    CASE 
      WHEN COUNT(*) > 0 THEN
        (COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM lineups l WHERE l.game_id = g.id) THEN g.id END)::NUMERIC / COUNT(*)) * 100
      ELSE 0
    END as lineups_pct,
    -- ML Ready percentage (has xG + possession + lineups)
    CASE 
      WHEN COUNT(*) > 0 THEN
        (COUNT(*) FILTER (WHERE 
          g.home_xg IS NOT NULL 
          AND g.home_possession IS NOT NULL
          AND EXISTS(SELECT 1 FROM lineups l WHERE l.game_id = g.id)
        )::NUMERIC / COUNT(*)) * 100
      ELSE 0
    END as ml_ready_pct,
    -- Overall status
    CASE 
      WHEN COUNT(*) = 0 THEN '❌ Empty'
      WHEN (COUNT(*) FILTER (WHERE g.home_xg IS NOT NULL AND g.home_possession IS NOT NULL)::NUMERIC / COUNT(*)) >= 0.9 THEN '✅ Excellent'
      WHEN (COUNT(*) FILTER (WHERE g.home_xg IS NOT NULL AND g.home_possession IS NOT NULL)::NUMERIC / COUNT(*)) >= 0.7 THEN '⚠️  Good'
      ELSE '❌ Incomplete'
    END as overall_status
  FROM games g
  WHERE g.season = p_season
  GROUP BY g.league_key
  ORDER BY g.league_key;
END;
$$ LANGUAGE plpgsql;

-- ================================================
DROP FUNCTION IF EXISTS validate_league_by_round(TEXT, TEXT);
-- 10. VALIDATE LEAGUE BY ROUND
-- ================================================

CREATE OR REPLACE FUNCTION validate_league_by_round(
  p_league_key TEXT,
  p_season TEXT
)
RETURNS TABLE (
  round INTEGER,
  total_games BIGINT,
  completed_games BIGINT,
  scheduled_games BIGINT,
  teams_count BIGINT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.round,
    COUNT(*) as total_games,
    COUNT(*) FILTER (WHERE g.status = 'completed') as completed_games,
    COUNT(*) FILTER (WHERE g.status = 'scheduled') as scheduled_games,
    COUNT(DISTINCT g.home_team_id) + COUNT(DISTINCT g.away_team_id) as teams_count,
    CASE 
      WHEN COUNT(*) = 0 THEN 'Empty'
      WHEN COUNT(*) FILTER (WHERE g.status = 'completed') = COUNT(*) THEN 'Complete'
      WHEN COUNT(*) FILTER (WHERE g.status = 'scheduled') = COUNT(*) THEN 'Scheduled'
      ELSE 'In Progress'
    END as status
  FROM games g
  WHERE g.league_key = p_league_key
    AND g.season = p_season
    AND g.round IS NOT NULL
  GROUP BY g.round
  ORDER BY g.round;
END;
$$ LANGUAGE plpgsql;

-- ================================================
DROP FUNCTION IF EXISTS find_round_duplicates(TEXT, TEXT);
-- 11. FIND ROUND DUPLICATES
-- ================================================

CREATE OR REPLACE FUNCTION find_round_duplicates(
  p_league_key TEXT,
  p_season TEXT
)
RETURNS TABLE (
  round INTEGER,
  home_team TEXT,
  away_team TEXT,
  duplicate_count BIGINT,
  game_ids BIGINT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.round,
    t1.name as home_team,
    t2.name as away_team,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(g.id ORDER BY g.id) as game_ids
  FROM games g
  JOIN teams t1 ON g.home_team_id = t1.id
  JOIN teams t2 ON g.away_team_id = t2.id
  WHERE g.league_key = p_league_key
    AND g.season = p_season
    AND g.round IS NOT NULL
  GROUP BY g.round, t1.name, t2.name
  HAVING COUNT(*) > 1
  ORDER BY g.round, duplicate_count DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- GRANT EXECUTE PERMISSIONS
-- ================================================

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION find_duplicate_games() TO authenticated;
GRANT EXECUTE ON FUNCTION remove_duplicate_games() TO authenticated;
GRANT EXECUTE ON FUNCTION league_data_completeness(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION games_missing_flashscore_urls(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION games_incomplete_scraping(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_game_status() TO authenticated;
GRANT EXECUTE ON FUNCTION estimate_missing_xg() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_league_season(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_all_leagues(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_league_by_round(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION find_round_duplicates(TEXT, TEXT) TO authenticated;

-- Grant execute to service role (for server-side operations)
GRANT EXECUTE ON FUNCTION find_duplicate_games() TO service_role;
GRANT EXECUTE ON FUNCTION remove_duplicate_games() TO service_role;
GRANT EXECUTE ON FUNCTION league_data_completeness(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION games_missing_flashscore_urls(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION games_incomplete_scraping(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION update_game_status() TO service_role;
GRANT EXECUTE ON FUNCTION estimate_missing_xg() TO service_role;
GRANT EXECUTE ON FUNCTION validate_league_season(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION validate_all_leagues(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION validate_league_by_round(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION find_round_duplicates(TEXT, TEXT) TO service_role;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
-- Summary:
-- ✅ Created 11 PostgreSQL functions for db-maintenance.js
-- ✅ All functions use CREATE OR REPLACE - safe to run multiple times
-- ✅ Proper permissions granted
-- ✅ Functions handle NULL parameters gracefully
-- ✅ All return tables for easy consumption by JavaScript/TypeScript
