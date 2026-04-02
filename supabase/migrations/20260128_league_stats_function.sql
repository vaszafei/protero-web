-- Database function to calculate league statistics efficiently
-- This performs aggregations in the database instead of client-side

CREATE OR REPLACE FUNCTION calculate_league_stats(
  p_league TEXT,
  p_season TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
  total_games INT;
  games_with_scores INT;
  games_with_stats INT;
  games_with_lineups INT;
  games_with_player_stats INT;
  games_with_referees INT;
  games_with_odds INT;
  games_with_formations INT;
  latest_round INT;
BEGIN
  -- Get total games for the league/season
  SELECT COUNT(*)
  INTO total_games
  FROM games
  WHERE league_key = p_league
    AND (p_season IS NULL OR season = p_season);

  -- Games with scores
  SELECT COUNT(*)
  INTO games_with_scores
  FROM games
  WHERE league_key = p_league
    AND (p_season IS NULL OR season = p_season)
    AND home_goals IS NOT NULL
    AND away_goals IS NOT NULL;

  -- Games with stats (is_scraped or has real stats data)
  SELECT COUNT(*)
  INTO games_with_stats
  FROM games
  WHERE league_key = p_league
    AND (p_season IS NULL OR season = p_season)
    AND (
      is_scraped = true
      OR (home_shots > 0 OR away_shots > 0)
      OR (home_possession_pct IS NOT NULL AND away_possession_pct IS NOT NULL 
          AND NOT (home_possession_pct = 50 AND away_possession_pct = 50))
      OR (home_corners > 0 OR away_corners > 0)
    );

  -- Games with formations
  SELECT COUNT(*)
  INTO games_with_formations
  FROM games
  WHERE league_key = p_league
    AND (p_season IS NULL OR season = p_season)
    AND home_formation IS NOT NULL
    AND away_formation IS NOT NULL;

  -- Games with lineups (estimate from formations)
  games_with_lineups := games_with_formations;

  -- Games with player stats (estimate from formations)
  games_with_player_stats := games_with_formations;

  -- Games with referees
  SELECT COUNT(*)
  INTO games_with_referees
  FROM games
  WHERE league_key = p_league
    AND (p_season IS NULL OR season = p_season)
    AND referee_id IS NOT NULL;

  -- Games with odds
  SELECT COUNT(*)
  INTO games_with_odds
  FROM games
  WHERE league_key = p_league
    AND (p_season IS NULL OR season = p_season)
    AND (odds_home IS NOT NULL OR odds_draw IS NOT NULL OR odds_away IS NOT NULL);

  -- Latest round with games
  SELECT COALESCE(MAX(round), 0)
  INTO latest_round
  FROM games
  WHERE league_key = p_league
    AND (p_season IS NULL OR season = p_season)
    AND home_goals IS NOT NULL
    AND away_goals IS NOT NULL;

  -- Build JSON response
  result := json_build_object(
    'total_games', total_games,
    'games_with_scores', games_with_scores,
    'games_with_stats', games_with_stats,
    'games_with_lineups', games_with_lineups,
    'games_with_player_stats', games_with_player_stats,
    'games_with_referees', games_with_referees,
    'games_with_odds', games_with_odds,
    'games_with_formations', games_with_formations,
    'latest_round', latest_round,
    'scores_percentage', CASE WHEN total_games > 0 THEN ROUND((games_with_scores::NUMERIC / total_games) * 100) ELSE 0 END,
    'stats_coverage', CASE WHEN total_games > 0 THEN ROUND((games_with_stats::NUMERIC / total_games) * 100) ELSE 0 END,
    'lineups_coverage', CASE WHEN total_games > 0 THEN ROUND((games_with_lineups::NUMERIC / total_games) * 100) ELSE 0 END,
    'player_stats_coverage', CASE WHEN total_games > 0 THEN ROUND((games_with_player_stats::NUMERIC / total_games) * 100) ELSE 0 END,
    'referees_coverage', CASE WHEN total_games > 0 THEN ROUND((games_with_referees::NUMERIC / total_games) * 100) ELSE 0 END,
    'odds_coverage', CASE WHEN total_games > 0 THEN ROUND((games_with_odds::NUMERIC / total_games) * 100) ELSE 0 END,
    'formations_coverage', CASE WHEN total_games > 0 THEN ROUND((games_with_formations::NUMERIC / total_games) * 100) ELSE 0 END
  );

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_league_stats TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_league_stats TO anon;
