-- Quick fix for validate_all_leagues function
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS validate_all_leagues(TEXT);

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_all_leagues(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_all_leagues(TEXT) TO service_role;
