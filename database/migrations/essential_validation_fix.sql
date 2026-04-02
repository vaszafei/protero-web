-- ================================================
-- DROP OLD FUNCTIONS FIRST
-- ================================================
DROP FUNCTION IF EXISTS validate_league_season(TEXT, TEXT);
DROP FUNCTION IF EXISTS validate_all_leagues(TEXT);
DROP FUNCTION IF EXISTS validate_league_by_round(TEXT, TEXT);
DROP FUNCTION IF EXISTS find_round_duplicates(TEXT, TEXT, INTEGER);

-- ================================================
-- RECREATE WITH PROPER TYPE CASTING
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
  SELECT COUNT(*)::INTEGER INTO total_games
  FROM games
  WHERE league_key = p_league_key AND season = p_season;
  
  -- Get number of teams
  SELECT COUNT(DISTINCT home_team_id)::INTEGER INTO teams_count
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
    (total_games >= (teams_count * (teams_count - 1) * 0.8))::BOOLEAN;
  
  -- 2. Games with Flashscore URLs
  RETURN QUERY
  SELECT 
    'Has Flashscore URL'::TEXT,
    CASE 
      WHEN COUNT(*)::NUMERIC >= total_games::NUMERIC * 0.9 THEN 'GOOD'
      WHEN COUNT(*)::NUMERIC >= total_games::NUMERIC * 0.7 THEN 'NEEDS WORK'
      ELSE 'CRITICAL'
    END::TEXT,
    COUNT(*)::TEXT,
    total_games::TEXT,
    ROUND(100.0 * COUNT(*) / NULLIF(total_games, 0), 1),
    (COUNT(*)::NUMERIC >= total_games::NUMERIC * 0.9)
  FROM games
  WHERE league_key = p_league_key 
    AND season = p_season 
    AND flashscore_url IS NOT NULL;
  
  -- 3. Games Scraped (has URL AND actual scraped data)
  RETURN QUERY
  SELECT 
    'Has Game Stats'::TEXT,
    CASE 
      WHEN COUNT(*)::NUMERIC >= total_games::NUMERIC * 0.9 THEN 'GOOD'
      WHEN COUNT(*)::NUMERIC >= total_games::NUMERIC * 0.7 THEN 'NEEDS WORK'
      ELSE 'CRITICAL'
    END::TEXT,
    COUNT(*)::TEXT,
    total_games::TEXT,
    ROUND(100.0 * COUNT(*) / NULLIF(total_games, 0), 1),
    (COUNT(*)::NUMERIC >= total_games::NUMERIC * 0.9)
  FROM games
  WHERE league_key = p_league_key 
    AND season = p_season 
    AND flashscore_url IS NOT NULL
    AND (home_shots IS NOT NULL OR home_possession IS NOT NULL OR home_corners IS NOT NULL);
  
  -- 4. Games with xG Data (requires URL + scraped data)
  RETURN QUERY
  SELECT 
    'Has xG Data'::TEXT,
    CASE 
      WHEN COUNT(*)::NUMERIC >= total_games::NUMERIC * 0.7 THEN 'GOOD'
      WHEN COUNT(*)::NUMERIC >= total_games::NUMERIC * 0.5 THEN 'NEEDS WORK'
      ELSE 'CRITICAL'
    END::TEXT,
    COUNT(*)::TEXT,
    total_games::TEXT,
    ROUND(100.0 * COUNT(*) / NULLIF(total_games, 0), 1),
    (COUNT(*)::NUMERIC >= total_games::NUMERIC * 0.7)
  FROM games
  WHERE league_key = p_league_key 
    AND season = p_season 
    AND flashscore_url IS NOT NULL
    AND home_xg IS NOT NULL AND away_xg IS NOT NULL;
  
  -- 5. Games with Lineups (requires URL)
  RETURN QUERY
  SELECT 
    'Has Lineups'::TEXT,
    CASE 
      WHEN COUNT(DISTINCT g.id)::NUMERIC >= total_games::NUMERIC * 0.7 THEN 'GOOD'
      WHEN COUNT(DISTINCT g.id)::NUMERIC >= total_games::NUMERIC * 0.5 THEN 'NEEDS WORK'
      ELSE 'CRITICAL'
    END::TEXT,
    COUNT(DISTINCT g.id)::TEXT,
    total_games::TEXT,
    ROUND(100.0 * COUNT(DISTINCT g.id) / NULLIF(total_games, 0), 1),
    (COUNT(DISTINCT g.id)::NUMERIC >= total_games::NUMERIC * 0.7)
  FROM games g
  WHERE g.league_key = p_league_key 
    AND g.season = p_season
    AND g.flashscore_url IS NOT NULL
    AND EXISTS(SELECT 1 FROM lineups l WHERE l.game_id = g.id);
  
  -- 6. Games with Odds
  RETURN QUERY
  SELECT 
    'Has Odds'::TEXT,
    CASE 
      WHEN COUNT(*)::NUMERIC >= total_games::NUMERIC * 0.7 THEN 'GOOD'
      WHEN COUNT(*)::NUMERIC >= total_games::NUMERIC * 0.5 THEN 'NEEDS WORK'
      ELSE 'CRITICAL'
    END::TEXT,
    COUNT(*)::TEXT,
    total_games::TEXT,
    ROUND(100.0 * COUNT(*) / NULLIF(total_games, 0), 1),
    (COUNT(*)::NUMERIC >= total_games::NUMERIC * 0.7)
  FROM games
  WHERE league_key = p_league_key 
    AND season = p_season 
    AND odds_home IS NOT NULL;
  
  -- 7. Games with Results (completed games)
  RETURN QUERY
  SELECT 
    'Has Results'::TEXT,
    CASE 
      WHEN COUNT(*)::NUMERIC >= total_games::NUMERIC * 0.5 THEN 'GOOD'
      WHEN COUNT(*)::NUMERIC >= total_games::NUMERIC * 0.3 THEN 'NEEDS WORK'
      ELSE 'CRITICAL'
    END::TEXT,
    COUNT(*)::TEXT,
    total_games::TEXT,
    ROUND(100.0 * COUNT(*) / NULLIF(total_games, 0), 1),
    (COUNT(*)::NUMERIC >= total_games::NUMERIC * 0.3)
  FROM games
  WHERE league_key = p_league_key 
    AND season = p_season 
    AND home_goals IS NOT NULL;
  
  -- 8. Overall ML Readiness (games ready for training - requires URL)
  RETURN QUERY
  SELECT 
    '✨ ML Training Ready'::TEXT,
    CASE 
      WHEN COUNT(*)::NUMERIC >= total_games::NUMERIC * 0.5 THEN 'READY ✅'
      ELSE 'NOT READY ❌'
    END::TEXT,
    COUNT(*)::TEXT,
    total_games::TEXT,
    ROUND(100.0 * COUNT(*) / NULLIF(total_games, 0), 1),
    (COUNT(*)::NUMERIC >= total_games::NUMERIC * 0.5)
  FROM games
  WHERE league_key = p_league_key 
    AND season = p_season 
    AND flashscore_url IS NOT NULL
    AND home_goals IS NOT NULL 
    AND home_xg IS NOT NULL 
    AND away_xg IS NOT NULL
    AND odds_home IS NOT NULL;
  
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- ROUND-BY-ROUND VALIDATION
-- ================================================

CREATE OR REPLACE FUNCTION validate_league_by_round(
  p_league_key TEXT,
  p_season TEXT DEFAULT '2025-2026'
)
RETURNS TABLE (
  round_number INTEGER,
  total_games BIGINT,
  expected_games INTEGER,
  game_count_status TEXT,
  has_url_count BIGINT,
  has_url_pct NUMERIC,
  scraped_count BIGINT,
  scraped_pct NUMERIC,
  xg_count BIGINT,
  xg_pct NUMERIC,
  lineups_count BIGINT,
  lineups_pct NUMERIC,
  odds_count BIGINT,
  odds_pct NUMERIC,
  referee_count BIGINT,
  referee_pct NUMERIC,
  ml_ready_count BIGINT,
  ml_ready_pct NUMERIC,
  round_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH team_count AS (
    -- Get number of teams in this league/season
    SELECT COUNT(DISTINCT home_team_id)::INTEGER as teams
    FROM games
    WHERE league_key = p_league_key AND season = p_season
  ),
  lineup_flags AS (
    -- Get distinct game_ids with lineups for this league/season only
    SELECT DISTINCT l.game_id::BIGINT AS game_id
    FROM lineups l
    INNER JOIN games g ON l.game_id = g.id
    WHERE g.league_key = p_league_key AND g.season = p_season
  ),
  round_data AS (
    SELECT 
      g.round::INTEGER as round_num,
      g.id,
      (g.flashscore_url IS NOT NULL) AS has_url,
      (g.flashscore_url IS NOT NULL AND (g.home_shots IS NOT NULL OR g.home_possession IS NOT NULL OR g.home_corners IS NOT NULL)) AS is_scraped,
      (g.flashscore_url IS NOT NULL AND g.home_xg IS NOT NULL AND g.away_xg IS NOT NULL) AS has_xg,
      (lf.game_id IS NOT NULL) AS has_lineups,
      (g.odds_home IS NOT NULL) AS has_odds,
      (g.referee_name IS NOT NULL) AS has_referee,
      (g.flashscore_url IS NOT NULL AND g.home_goals IS NOT NULL AND g.home_xg IS NOT NULL AND g.away_xg IS NOT NULL AND g.odds_home IS NOT NULL) AS ml_ready,
      (SELECT teams / 2 FROM team_count) as expected_games_per_round
    FROM games g
    LEFT JOIN lineup_flags lf ON lf.game_id = g.id
    WHERE g.league_key = p_league_key 
      AND g.season = p_season
      AND g.round IS NOT NULL
  )
  SELECT 
    rd.round_num,
    COUNT(*)::BIGINT as total,
    rd.expected_games_per_round,
    CASE 
      WHEN COUNT(*) = rd.expected_games_per_round THEN '✅'
      WHEN COUNT(*) > rd.expected_games_per_round THEN '⚠️ +' || (COUNT(*) - rd.expected_games_per_round)::TEXT
      ELSE '⚠️ -' || (rd.expected_games_per_round - COUNT(*))::TEXT
    END as game_count_status,
    SUM((rd.has_url)::INT)::BIGINT as url_count,
    ROUND(100.0 * SUM((rd.has_url)::INT) / COUNT(*), 1) as url_pct,
    SUM((rd.is_scraped)::INT)::BIGINT as scr_count,
    ROUND(100.0 * SUM((rd.is_scraped)::INT) / COUNT(*), 1) as scr_pct,
    SUM((rd.has_xg)::INT)::BIGINT as xg_count,
    ROUND(100.0 * SUM((rd.has_xg)::INT) / COUNT(*), 1) as xg_pct,
    SUM((rd.has_lineups)::INT)::BIGINT as lineups_count,
    ROUND(100.0 * SUM((rd.has_lineups)::INT) / COUNT(*), 1) as lineups_pct,
    SUM((rd.has_odds)::INT)::BIGINT as odds_count,
    ROUND(100.0 * SUM((rd.has_odds)::INT) / COUNT(*), 1) as odds_pct,
    SUM((rd.has_referee)::INT)::BIGINT as referee_count,
    ROUND(100.0 * SUM((rd.has_referee)::INT) / COUNT(*), 1) as referee_pct,
    SUM((rd.ml_ready)::INT)::BIGINT as ml_ready_count,
    ROUND(100.0 * SUM((rd.ml_ready)::INT) / COUNT(*), 1) as ml_ready_pct,
    CASE 
      WHEN COUNT(*) != rd.expected_games_per_round THEN '🔴 WRONG COUNT'
      WHEN ROUND(100.0 * SUM((rd.ml_ready)::INT) / COUNT(*), 1) >= 90 THEN '✅ COMPLETE'
      WHEN ROUND(100.0 * SUM((rd.ml_ready)::INT) / COUNT(*), 1) >= 70 THEN '⚠️  GOOD'
      WHEN ROUND(100.0 * SUM((rd.has_url)::INT) / COUNT(*), 1) = 0 THEN '❌ NO URLS'
      ELSE '⚠️  INCOMPLETE'
    END as status
  FROM round_data rd
  GROUP BY rd.round_num, rd.expected_games_per_round
  ORDER BY rd.round_num;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- FIND DUPLICATE GAMES IN A ROUND
-- ================================================

DROP FUNCTION IF EXISTS find_round_duplicates(TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION find_round_duplicates(
  p_league_key TEXT,
  p_season TEXT DEFAULT '2025-2026',
  p_round INTEGER DEFAULT NULL
)
RETURNS TABLE (
  round_number TEXT,
  home_team_id BIGINT,
  away_team_id BIGINT,
  duplicate_count BIGINT,
  game_ids TEXT[],
  game_dates TEXT[],
  flashscore_urls TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.round::TEXT,
    g.home_team_id::BIGINT,
    g.away_team_id::BIGINT,
    COUNT(*)::BIGINT,
    ARRAY_AGG(g.id::TEXT ORDER BY g.id),
    ARRAY_AGG(g.date::TEXT ORDER BY g.id),
    ARRAY_AGG(COALESCE(g.flashscore_url, 'NULL') ORDER BY g.id)
  FROM games g
  WHERE g.league_key = p_league_key 
    AND g.season = p_season
    AND (p_round IS NULL OR g.round::INTEGER = p_round)
  GROUP BY g.round, g.home_team_id, g.away_team_id
  HAVING COUNT(*) > 1
  ORDER BY g.round::INTEGER, g.home_team_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- REMOVE DUPLICATE GAMES (keep most complete one)
-- ================================================

CREATE OR REPLACE FUNCTION remove_round_duplicate(
  p_game_id_to_keep INTEGER,
  p_game_ids_to_delete INTEGER[]
)
RETURNS TABLE (
  deleted_count INTEGER,
  kept_game_id INTEGER,
  message TEXT
) AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- Delete the specified duplicate games
  DELETE FROM games 
  WHERE id = ANY(p_game_ids_to_delete);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN QUERY
  SELECT 
    v_deleted_count,
    p_game_id_to_keep,
    'Deleted ' || v_deleted_count || ' duplicate game(s), kept game ID: ' || p_game_id_to_keep AS message;
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
  WITH lineup_flags AS (
    -- Get distinct game_ids with lineups for this season only
    SELECT DISTINCT l.game_id::BIGINT AS game_id
    FROM lineups l
    INNER JOIN games g ON l.game_id = g.id
    WHERE g.season = p_season
  ),
  game_flags AS (
    SELECT 
      g.league_key,
      g.id,
      (g.flashscore_url IS NOT NULL AND (g.home_shots IS NOT NULL OR g.home_possession IS NOT NULL OR g.home_corners IS NOT NULL)) AS is_scraped_flag,
      (g.flashscore_url IS NOT NULL AND g.home_xg IS NOT NULL AND g.away_xg IS NOT NULL) AS has_xg,
      (lf.game_id IS NOT NULL) AS has_lineups,
      (g.flashscore_url IS NOT NULL AND g.home_goals IS NOT NULL AND g.home_xg IS NOT NULL AND g.away_xg IS NOT NULL AND g.odds_home IS NOT NULL) AS ml_ready
    FROM games g
    LEFT JOIN lineup_flags lf ON lf.game_id = g.id
    WHERE g.season = p_season
  ),
  league_stats AS (
    SELECT 
      gf.league_key,
      COUNT(*)::NUMERIC as total_games,
      ROUND(100.0 * SUM((gf.is_scraped_flag)::INT) / COUNT(*), 1) as scraped_pct,
      ROUND(100.0 * SUM((gf.has_xg)::INT) / COUNT(*), 1) as xg_pct,
      ROUND(100.0 * SUM((gf.has_lineups)::INT) / COUNT(*), 1) as lineups_pct,
      ROUND(100.0 * SUM((gf.ml_ready)::INT) / COUNT(*), 1) as ml_ready_pct
    FROM game_flags gf
    GROUP BY gf.league_key
  )
  SELECT 
    ls.league_key,
    ls.total_games::BIGINT,
    ls.scraped_pct,
    ls.xg_pct,
    ls.lineups_pct,
    ls.ml_ready_pct,
    CASE 
      WHEN ls.ml_ready_pct >= 70 THEN '✅ EXCELLENT'
      WHEN ls.ml_ready_pct >= 50 THEN '⚠️  GOOD'
      WHEN ls.ml_ready_pct >= 30 THEN '⚠️  NEEDS WORK'
      ELSE '❌ CRITICAL'
    END as overall_status
  FROM league_stats ls
  ORDER BY ls.ml_ready_pct DESC;
END;
$$ LANGUAGE plpgsql;
