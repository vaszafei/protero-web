-- ============================================================
-- MIGRATION: Multi-Sport Support
-- Date:    2026-03-10
-- Author:  GitHub Copilot
-- Purpose: Extend the Protero schema to support Basketball
--          (and any future sport) while keeping full backward
--          compatibility with all existing Football data.
--
-- Changes:
--   1. sports        — new reference table (master sport registry)
--   2. games         — add: sport, sport_stats JSONB
--   3. teams         — add: sport
--   4. leagues       — add: sport
--   5. scrape_log    — create (was missing from cloud)
--   6. Indexes       — composite multi-sport indexes + GIN for JSONB
--   7. vw_games_needing_scrape — recreated as sport-aware + debounce
--   8. v_active_predictions    — updated to include sport column
--
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE.
-- Zero-downtime: new columns have defaults; existing rows unchanged.
-- ============================================================


-- ============================================================
-- 1. SPORTS REFERENCE TABLE
-- ============================================================
-- Master registry of every sport Protero supports.
-- The `stat_schema` JSONB documents which keys are expected
-- in games.sport_stats for that sport (used by scrapers/ML).

CREATE TABLE IF NOT EXISTS sports (
  key         TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,

  -- Canonical keys expected in games.sport_stats for this sport.
  -- Scrapers and ML pipelines read this to know what to collect.
  stat_schema JSONB,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the two sports we need today
INSERT INTO sports (key, name, description, stat_schema) VALUES

('football', 'Football', 'Association Football (Soccer)', '{
  "possession_pct":   "integer — home/away ball possession 0-100",
  "corners":          "integer — corner kicks",
  "fouls":            "integer — fouls committed",
  "yellow_cards":     "integer",
  "red_cards":        "integer",
  "shots":            "integer — total shots",
  "shots_on_target":  "integer",
  "xG":               "numeric — expected goals",
  "formation":        "text — tactical shape e.g. 4-3-3",
  "referee":          "text",
  "offsides":         "integer",
  "saves":            "integer",
  "big_chances":      "integer",
  "tackles_won":      "integer",
  "clearances":       "integer",
  "interceptions":    "integer",
  "aerials_won":      "integer",
  "passes_completed": "integer",
  "passes_attempted": "integer"
}'::jsonb),

('basketball', 'Basketball', 'Basketball (NBA, EuroLeague, FIBA, etc.)', '{
  "q1_home":              "integer — Q1 score home",
  "q1_away":              "integer — Q1 score away",
  "q2_home":              "integer — Q2 score home",
  "q2_away":              "integer — Q2 score away",
  "q3_home":              "integer — Q3 score home",
  "q3_away":              "integer — Q3 score away",
  "q4_home":              "integer — Q4 score home",
  "q4_away":              "integer — Q4 score away",
  "ot_home":              "integer — OT score home (null if no OT)",
  "ot_away":              "integer — OT score away",
  "rebounds_home":        "integer — total rebounds home",
  "rebounds_away":        "integer",
  "off_rebounds_home":    "integer — offensive rebounds",
  "off_rebounds_away":    "integer",
  "def_rebounds_home":    "integer — defensive rebounds",
  "def_rebounds_away":    "integer",
  "assists_home":         "integer",
  "assists_away":         "integer",
  "steals_home":          "integer",
  "steals_away":          "integer",
  "blocks_home":          "integer",
  "blocks_away":          "integer",
  "turnovers_home":       "integer",
  "turnovers_away":       "integer",
  "personal_fouls_home":  "integer",
  "personal_fouls_away":  "integer",
  "three_made_home":      "integer — 3-pointers made",
  "three_made_away":      "integer",
  "three_att_home":       "integer — 3-pointers attempted",
  "three_att_away":       "integer",
  "ft_made_home":         "integer — free throws made",
  "ft_made_away":         "integer",
  "ft_att_home":          "integer — free throws attempted",
  "ft_att_away":          "integer",
  "fg_pct_home":          "numeric — field goal %",
  "fg_pct_away":          "numeric",
  "three_pct_home":       "numeric — 3-point %",
  "three_pct_away":       "numeric",
  "ft_pct_home":          "numeric — free throw %",
  "ft_pct_away":          "numeric",
  "paint_points_home":    "integer — points in the paint",
  "paint_points_away":    "integer",
  "fastbreak_pts_home":   "integer",
  "fastbreak_pts_away":   "integer",
  "second_chance_home":   "integer — second chance points",
  "second_chance_away":   "integer"
}'::jsonb)

ON CONFLICT (key) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      stat_schema = EXCLUDED.stat_schema,
      is_active   = EXCLUDED.is_active;


-- ============================================================
-- 2. ADD sport COLUMN TO games
-- ============================================================
-- Default = 'football' → all 15 685 existing rows become football
-- automatically, no data migration needed.

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS sport TEXT NOT NULL DEFAULT 'football'
  REFERENCES sports(key);

-- JSONB bag for sport-specific stats that don't have dedicated columns.
-- • Football:    mostly redundant (dedicated columns exist), kept for
--               forward-compat and for any new stats we add later.
-- • Basketball:  primary storage for all basketball statistics
--               (use the keys defined in sports.stat_schema above).
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS sport_stats JSONB;

COMMENT ON COLUMN games.sport IS
  'Sport discriminator: football | basketball. Default: football. '
  'All rows inserted before this migration are automatically football.';

COMMENT ON COLUMN games.sport_stats IS
  'Sport-specific stats as JSONB. '
  'Basketball keys: q1_home/away, q2/q3/q4, ot, rebounds, assists, '
  'steals, blocks, turnovers, three_made/att, ft_made/att, '
  'fg_pct, three_pct, ft_pct, paint_points, fastbreak_pts, etc. '
  'See sports.stat_schema for the full list per sport.';


-- ============================================================
-- 3. ADD sport COLUMN TO teams
-- ============================================================
-- A team belongs to exactly one sport.
-- "Lakers" (basketball) vs "LA Galaxy" (football) = different rows.

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS sport TEXT NOT NULL DEFAULT 'football'
  REFERENCES sports(key);

COMMENT ON COLUMN teams.sport IS
  'Sport the team competes in. Same real-world name can appear '
  'multiple times across sports (each row is a distinct team).';


-- ============================================================
-- 4. ADD sport COLUMN TO leagues
-- ============================================================
ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS sport TEXT NOT NULL DEFAULT 'football'
  REFERENCES sports(key);

COMMENT ON COLUMN leagues.sport IS
  'Sport this league belongs to. '
  'All existing 16 leagues default to football.';


-- ============================================================
-- 5. CREATE scrape_log TABLE (missing from cloud)
-- ============================================================
-- Audit trail for every scrape attempt on a game.
-- Used by vw_games_needing_scrape to debounce re-scrapes.

CREATE TABLE IF NOT EXISTS scrape_log (
  id            BIGSERIAL    PRIMARY KEY,
  game_id       INTEGER      NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  scraped_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  fields_saved  TEXT[],          -- e.g. ARRAY['possession','corners','referee']
  attempt       SMALLINT     DEFAULT 1,
  success       BOOLEAN      DEFAULT TRUE,
  error_msg     TEXT
);

CREATE INDEX IF NOT EXISTS idx_scrape_log_game_id
  ON scrape_log(game_id);

CREATE INDEX IF NOT EXISTS idx_scrape_log_scraped_at
  ON scrape_log(scraped_at DESC);

COMMENT ON TABLE scrape_log IS
  'Audit log of every FlashScore scrape attempt. '
  'vw_games_needing_scrape uses this to avoid hammering the same '
  'game within 12 hours of a successful scrape.';


-- ============================================================
-- 6. INDEXES — multi-sport optimised
-- ============================================================

-- Single-column sport filters
CREATE INDEX IF NOT EXISTS idx_games_sport
  ON games(sport);

CREATE INDEX IF NOT EXISTS idx_teams_sport
  ON teams(sport);

CREATE INDEX IF NOT EXISTS idx_leagues_sport
  ON leagues(sport);

-- Composite indexes for typical query patterns:
--   "give me all football games in season X with status completed"
CREATE INDEX IF NOT EXISTS idx_games_sport_season
  ON games(sport, season);

CREATE INDEX IF NOT EXISTS idx_games_sport_league
  ON games(sport, league_key);

CREATE INDEX IF NOT EXISTS idx_games_sport_status
  ON games(sport, status);

CREATE INDEX IF NOT EXISTS idx_games_sport_league_season
  ON games(sport, league_key, season);

-- GIN indexes for JSONB columns (fast key/value lookups)
CREATE INDEX IF NOT EXISTS idx_games_sport_stats_gin
  ON games USING GIN (sport_stats)
  WHERE sport_stats IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_games_odds_raw_gin
  ON games USING GIN (odds_raw)
  WHERE odds_raw IS NOT NULL;


-- ============================================================
-- 7. vw_games_needing_scrape — sport-aware + debounce
-- ============================================================
-- Replaces the local-only version with a cloud-compatible view.
-- Key differences from the old version:
--   • football-specific checks (corners=0, possession=50, etc.)
--     are now guarded by  sport = 'football'
--   • basketball gets  'missing_sport_stats'  when sport_stats IS NULL
--   • odds check is cross-sport  (odds_home IS NULL)
--   • 12-hour debounce via scrape_log  (same as local version)

CREATE OR REPLACE VIEW vw_games_needing_scrape AS
SELECT
  g.id,
  g.league_key,
  g.season,
  g.date,
  g.flashscore_url,
  g.sport,

  -- Reason tag (highest-priority per row)
  CASE
    -- ── Football-specific reasons ───────────────────────────
    WHEN g.sport = 'football'
     AND g.home_corners       = 0
     AND g.away_corners       = 0
     AND g.home_fouls         = 0
     AND g.away_fouls         = 0
     AND g.home_possession_pct = 50
    THEN 'zero_fill_default'

    WHEN g.sport = 'football'
     AND g.home_possession_pct = 50
     AND g.away_possession_pct = 50
    THEN 'possession_default'

    WHEN g.sport = 'football'
     AND (   g.home_shots   IS NULL
          OR g.away_shots   IS NULL
          OR g.home_corners IS NULL
          OR g.away_corners IS NULL)
    THEN 'missing_stats'

    WHEN g.sport = 'football'
     AND g.home_formation IS NULL
    THEN 'missing_formation'

    WHEN g.sport = 'football'
     AND (g.referee_name IS NULL OR g.referee_name = '')
    THEN 'missing_referee'

    -- ── Basketball-specific reasons ─────────────────────────
    WHEN g.sport = 'basketball'
     AND g.sport_stats IS NULL
    THEN 'missing_sport_stats'

    -- ── Cross-sport reasons ─────────────────────────────────
    WHEN g.odds_home IS NULL
    THEN 'missing_odds'

    ELSE 'unknown'
  END AS reason,

  -- Last successful scrape timestamp (for UI / logging)
  MAX(sl.scraped_at) FILTER (WHERE sl.success = TRUE) AS last_scraped_at,

  -- Total scrape attempts (useful for alerting on repeated failures)
  COUNT(sl.id)                                         AS scrape_attempts

FROM games g
LEFT JOIN scrape_log sl ON sl.game_id = g.id

WHERE
  g.status = 'completed'
  AND g.home_goals IS NOT NULL        -- game has a final score
  AND g.flashscore_url IS NOT NULL    -- we have a URL to scrape from

  -- At least one of the following problems must be present:
  AND (
    -- Football: zero-fill artefact
    (   g.sport = 'football'
     AND g.home_corners = 0 AND g.away_corners = 0
     AND g.home_fouls = 0   AND g.away_fouls   = 0
     AND g.home_possession_pct = 50)

    -- Football: possession never scraped
    OR (   g.sport = 'football'
        AND g.home_possession_pct = 50
        AND g.away_possession_pct = 50)

    -- Football: core stats missing
    OR (   g.sport = 'football'
        AND (   g.home_shots   IS NULL
             OR g.away_shots   IS NULL
             OR g.home_corners IS NULL))

    -- Football: formation never picked up
    OR (g.sport = 'football' AND g.home_formation IS NULL)

    -- Football: referee never picked up
    OR (g.sport = 'football'
        AND (g.referee_name IS NULL OR g.referee_name = ''))

    -- Basketball: no sport_stats at all
    OR (g.sport = 'basketball' AND g.sport_stats IS NULL)

    -- Cross-sport: odds never fetched
    OR g.odds_home IS NULL
  )

GROUP BY g.id, g.league_key, g.season, g.date, g.flashscore_url, g.sport

HAVING
  -- Debounce: skip games scraped successfully in the last 12 hours
  MAX(sl.scraped_at) FILTER (WHERE sl.success = TRUE) IS NULL
  OR MAX(sl.scraped_at) FILTER (WHERE sl.success = TRUE)
       < NOW() - INTERVAL '12 hours';

COMMENT ON VIEW vw_games_needing_scrape IS
  'Completed games whose data is incomplete and not yet scraped '
  'in the last 12 h. Sport-aware: football and basketball have '
  'different completeness criteria. Join scrape_log for debounce.';


-- ============================================================
-- 8. UPDATE v_active_predictions — add sport column
-- ============================================================
-- Makes it easy for the frontend / ML pipeline to filter
-- predictions by sport without a JOIN back to games.

-- NOTE: PostgreSQL CREATE OR REPLACE VIEW requires new columns at the END.
-- sport is therefore placed after created_at (it existed before this migration).
CREATE OR REPLACE VIEW v_active_predictions AS
SELECT
  p.id,
  p.game_id,
  g.date          AS game_date,
  g.league_key,
  t1.name         AS home_team,
  t2.name         AS away_team,
  p.prediction,
  p.confidence,
  p.home_win_prob,
  p.draw_prob,
  p.away_win_prob,
  p.expected_value,
  p.kelly_percentage,
  p.model_version,
  p.created_at,
  g.sport                          -- NEW: added at end for OR REPLACE compat
FROM predictions p
JOIN games  g  ON p.game_id        = g.id
JOIN teams  t1 ON g.home_team_id   = t1.id
JOIN teams  t2 ON g.away_team_id   = t2.id
WHERE g.status = 'scheduled'
  AND g.date   >= NOW()
ORDER BY g.date ASC;

COMMENT ON VIEW v_active_predictions IS
  'Upcoming games with their latest prediction. '
  'Includes sport column for easy client-side filtering.';


-- ============================================================
-- 9. OPTIMISATION: additional missing indexes found in audit
-- ============================================================

-- Composite for the most common dashboard query:
-- "all completed games for a given league+season"
-- (already has idx_games_league_season_round, but add sport-aware variant)
CREATE INDEX IF NOT EXISTS idx_games_sport_league_season_status
  ON games(sport, league_key, season, status);

-- GIN on match_events for future full-text / JSONB search
-- (currently stored as TEXT; add if converted to JSONB later)
-- CREATE INDEX IF NOT EXISTS idx_games_match_events_gin
--   ON games USING GIN (to_tsvector('english', COALESCE(match_events, '')));

-- Partial index: upcoming games (fast for prediction queries)
CREATE INDEX IF NOT EXISTS idx_games_upcoming
  ON games(date, sport, league_key)
  WHERE status = 'scheduled';

-- Partial index: games with predictions (ML pipeline common join)
CREATE INDEX IF NOT EXISTS idx_games_completed_with_score
  ON games(sport, season, league_key)
  WHERE status = 'completed' AND home_goals IS NOT NULL;


-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Next steps for Basketball:
--   1. Create league rows with sport='basketball' in the leagues table
--   2. Run scraper pointed at basketball FlashScore URLs
--   3. Insert games with sport='basketball',
--      home_goals/away_goals = final points,
--      sport_stats = { q1_home, q1_away, ..., rebounds_home, ... }
--   4. odds_home/odds_away = moneyline  (odds_draw stays NULL)
--   5. The ML pipeline detects sport from games.sport and routes
--      to the appropriate feature engineering path
-- ============================================================
