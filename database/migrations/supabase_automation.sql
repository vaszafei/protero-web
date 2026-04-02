-- ================================================
-- SUPABASE AUTOMATION - TRIGGERS & CRON JOBS
-- ================================================
-- Date: January 28, 2026
-- Purpose: Automate database maintenance tasks

-- ================================================
-- 1. ENABLE CRON EXTENSION (for scheduled jobs)
-- ================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ================================================
-- 2. AUTOMATIC TRIGGERS (run on data changes)
-- ================================================

-- Auto-update game status when results are added
CREATE OR REPLACE FUNCTION auto_update_game_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If goals were just added, mark as completed
  IF NEW.home_goals IS NOT NULL AND NEW.away_goals IS NOT NULL THEN
    NEW.status = 'completed';
  END IF;
  
  -- If game is in the past and no goals, mark as postponed
  IF NEW.date < NOW() - INTERVAL '2 days' 
     AND NEW.home_goals IS NULL 
     AND NEW.status = 'scheduled' THEN
    NEW.status = 'postponed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: runs every time a game is inserted or updated
CREATE TRIGGER trigger_auto_update_game_status
  BEFORE INSERT OR UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_game_status();

-- ================================================
-- Auto-estimate xG when shots data is added
CREATE OR REPLACE FUNCTION auto_estimate_xg()
RETURNS TRIGGER AS $$
BEGIN
  -- If xG is missing but we have shots data, estimate it
  IF NEW.home_xg IS NULL 
     AND NEW.home_shots_on_target IS NOT NULL THEN
    NEW.home_xg = (NEW.home_shots_on_target * 0.15) + 
                   (COALESCE(NEW.home_big_chances, 0) * 0.4);
    NEW.xg_estimated = TRUE;
  END IF;
  
  IF NEW.away_xg IS NULL 
     AND NEW.away_shots_on_target IS NOT NULL THEN
    NEW.away_xg = (NEW.away_shots_on_target * 0.15) + 
                   (COALESCE(NEW.away_big_chances, 0) * 0.4);
    NEW.xg_estimated = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_estimate_xg
  BEFORE INSERT OR UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION auto_estimate_xg();

-- ================================================
-- Prevent duplicate games (stricter than unique index)
CREATE OR REPLACE FUNCTION prevent_duplicate_games()
RETURNS TRIGGER AS $$
DECLARE
  existing_id BIGINT;
BEGIN
  -- Check if game already exists
  SELECT id INTO existing_id
  FROM games
  WHERE home_team_id = NEW.home_team_id
    AND away_team_id = NEW.away_team_id
    AND DATE(date) = DATE(NEW.date)
    AND league_key = NEW.league_key
    AND id != COALESCE(NEW.id, 0);  -- Exclude current row on UPDATE
  
  IF existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate game detected! Game already exists with ID: %', existing_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_duplicates
  BEFORE INSERT OR UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_games();

-- ================================================
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all major tables
CREATE TRIGGER trigger_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_leagues_updated_at
  BEFORE UPDATE ON leagues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ================================================
-- Log important operations
CREATE TABLE IF NOT EXISTS operation_logs (
  id BIGSERIAL PRIMARY KEY,
  operation_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id BIGINT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION log_game_operations()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO operation_logs (operation_type, table_name, record_id, details)
    VALUES ('INSERT', 'games', NEW.id, jsonb_build_object(
      'league_key', NEW.league_key,
      'home_team_id', NEW.home_team_id,
      'away_team_id', NEW.away_team_id,
      'date', NEW.date
    ));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO operation_logs (operation_type, table_name, record_id, details)
    VALUES ('DELETE', 'games', OLD.id, jsonb_build_object(
      'league_key', OLD.league_key,
      'reason', 'Manual deletion or duplicate cleanup'
    ));
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_game_operations
  AFTER INSERT OR DELETE ON games
  FOR EACH ROW
  EXECUTE FUNCTION log_game_operations();

-- ================================================
-- 3. SCHEDULED JOBS (CRON)
-- ================================================

-- Run daily at 2 AM: Update game statuses
SELECT cron.schedule(
  'daily-update-game-status',
  '0 2 * * *',  -- Every day at 2:00 AM
  $$
    SELECT update_game_status();
  $$
);

-- Run daily at 3 AM: Estimate missing xG
SELECT cron.schedule(
  'daily-estimate-xg',
  '0 3 * * *',  -- Every day at 3:00 AM
  $$
    SELECT estimate_missing_xg();
  $$
);

-- Run weekly on Monday at 4 AM: Check and report duplicates
SELECT cron.schedule(
  'weekly-check-duplicates',
  '0 4 * * 1',  -- Every Monday at 4:00 AM
  $$
    INSERT INTO operation_logs (operation_type, table_name, details)
    SELECT 
      'DUPLICATE_CHECK',
      'games',
      jsonb_build_object(
        'count', COUNT(*),
        'duplicates', jsonb_agg(jsonb_build_object(
          'game_id_1', game_id_1,
          'game_id_2', game_id_2,
          'league_key', league_key
        ))
      )
    FROM find_duplicate_games();
  $$
);

-- Run daily at 5 AM: Clean old operation logs (keep 30 days)
SELECT cron.schedule(
  'daily-cleanup-logs',
  '0 5 * * *',
  $$
    DELETE FROM operation_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
  $$
);

-- ================================================
-- 4. NOTIFICATION FUNCTIONS (for webhooks/alerts)
-- ================================================

-- Function to check data quality and alert if below threshold
CREATE OR REPLACE FUNCTION check_data_quality_alert()
RETURNS TABLE (
  league_key TEXT,
  season TEXT,
  issue TEXT,
  severity TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.league_key,
    g.season,
    CASE 
      WHEN scraping_pct < 50 THEN 'Less than 50% games scraped'
      WHEN xg_pct < 40 THEN 'Less than 40% games have xG data'
      WHEN url_pct < 60 THEN 'Less than 60% games have Flashscore URLs'
    END as issue,
    CASE 
      WHEN scraping_pct < 30 OR xg_pct < 20 THEN 'CRITICAL'
      WHEN scraping_pct < 50 OR xg_pct < 40 THEN 'WARNING'
      ELSE 'INFO'
    END as severity
  FROM (
    SELECT 
      g.league_key,
      g.season,
      COUNT(*) as total_games,
      ROUND(100.0 * COUNT(*) FILTER (WHERE g.is_scraped = TRUE) / COUNT(*), 2) as scraping_pct,
      ROUND(100.0 * COUNT(*) FILTER (WHERE g.home_xg IS NOT NULL) / COUNT(*), 2) as xg_pct,
      ROUND(100.0 * COUNT(*) FILTER (WHERE g.flashscore_url IS NOT NULL) / COUNT(*), 2) as url_pct
    FROM games g
    WHERE g.season = '2025-2026'
    GROUP BY g.league_key, g.season
  ) stats
  WHERE scraping_pct < 50 OR xg_pct < 40 OR url_pct < 60;
END;
$$ LANGUAGE plpgsql;

-- Run daily at 9 AM: Check data quality and log alerts
SELECT cron.schedule(
  'daily-quality-check',
  '0 9 * * *',
  $$
    INSERT INTO operation_logs (operation_type, table_name, details)
    SELECT 
      'DATA_QUALITY_ALERT',
      'games',
      jsonb_build_object(
        'timestamp', NOW(),
        'alerts', jsonb_agg(jsonb_build_object(
          'league', league_key,
          'issue', issue,
          'severity', severity
        ))
      )
    FROM check_data_quality_alert();
  $$
);

-- ================================================
-- 5. VIEWS FOR MONITORING AUTOMATION
-- ================================================

-- View scheduled cron jobs
CREATE OR REPLACE VIEW v_scheduled_jobs AS
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
ORDER BY jobname;

-- View recent operations
CREATE OR REPLACE VIEW v_recent_operations AS
SELECT 
  id,
  operation_type,
  table_name,
  record_id,
  details,
  created_at,
  AGE(NOW(), created_at) as time_ago
FROM operation_logs
ORDER BY created_at DESC
LIMIT 100;

-- View automation statistics
CREATE OR REPLACE VIEW v_automation_stats AS
SELECT 
  operation_type,
  COUNT(*) as total_operations,
  MAX(created_at) as last_run,
  AGE(NOW(), MAX(created_at)) as time_since_last
FROM operation_logs
GROUP BY operation_type
ORDER BY last_run DESC;

-- ================================================
-- 6. UTILITY FUNCTIONS
-- ================================================

-- Manually trigger all scheduled jobs (for testing)
CREATE OR REPLACE FUNCTION run_all_maintenance_now()
RETURNS TABLE (
  task TEXT,
  status TEXT,
  result TEXT
) AS $$
BEGIN
  -- Update game statuses
  RETURN QUERY
  SELECT 
    'Update Game Status'::TEXT,
    'SUCCESS'::TEXT,
    (SELECT update_game_status())::TEXT || ' games updated';
  
  -- Estimate xG
  RETURN QUERY
  SELECT 
    'Estimate xG'::TEXT,
    'SUCCESS'::TEXT,
    (SELECT estimate_missing_xg())::TEXT || ' games updated';
  
  -- Check duplicates
  RETURN QUERY
  SELECT 
    'Check Duplicates'::TEXT,
    CASE WHEN COUNT(*) > 0 THEN 'WARNING' ELSE 'SUCCESS' END::TEXT,
    COUNT(*)::TEXT || ' duplicates found'
  FROM find_duplicate_games();
  
END;
$$ LANGUAGE plpgsql;

-- Disable all cron jobs (for maintenance)
CREATE OR REPLACE FUNCTION disable_all_cron_jobs()
RETURNS TEXT AS $$
BEGIN
  UPDATE cron.job SET active = FALSE;
  RETURN 'All cron jobs disabled';
END;
$$ LANGUAGE plpgsql;

-- Enable all cron jobs
CREATE OR REPLACE FUNCTION enable_all_cron_jobs()
RETURNS TEXT AS $$
BEGIN
  UPDATE cron.job SET active = TRUE;
  RETURN 'All cron jobs enabled';
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- USAGE EXAMPLES & MONITORING
-- ================================================

-- View all scheduled jobs:
-- SELECT * FROM v_scheduled_jobs;

-- View recent operations:
-- SELECT * FROM v_recent_operations;

-- View automation statistics:
-- SELECT * FROM v_automation_stats;

-- Run all maintenance tasks now (for testing):
-- SELECT * FROM run_all_maintenance_now();

-- Check data quality alerts:
-- SELECT * FROM check_data_quality_alert();

-- View operation logs:
-- SELECT * FROM operation_logs ORDER BY created_at DESC LIMIT 50;

-- Disable automation during maintenance:
-- SELECT disable_all_cron_jobs();

-- Re-enable after maintenance:
-- SELECT enable_all_cron_jobs();

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON FUNCTION auto_update_game_status() IS 
  'Automatically updates game status when data changes. Runs on INSERT/UPDATE.';

COMMENT ON FUNCTION auto_estimate_xg() IS 
  'Automatically estimates xG from shots data when xG is missing. Runs on INSERT/UPDATE.';

COMMENT ON FUNCTION prevent_duplicate_games() IS 
  'Prevents duplicate games from being inserted. Raises exception if duplicate detected.';

COMMENT ON FUNCTION check_data_quality_alert() IS 
  'Checks data quality and returns alerts for leagues below thresholds.';

COMMENT ON FUNCTION run_all_maintenance_now() IS 
  'Manually triggers all maintenance tasks. Useful for testing or one-off runs.';
