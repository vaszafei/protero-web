-- ============================================================
-- MIGRATION: Seed Basketball Leagues
-- Date:    2026-03-10
-- Purpose: Add the 10 initial basketball leagues to the leagues
--          table so scrapers and teams can reference them.
--
-- Leagues added:
--   nba              NBA                          USA
--   euroleague       EuroLeague                   Europe
--   eurocup          EuroCup                      Europe
--   bcl              Basketball Champions League  Europe
--   acb              Liga ACB                     Spain
--   greece-bball     Stoiximan GBL                Greece
--   lba              Lega Basket Serie A           Italy
--   betclic-elite    Betclic Élite                France
--   bbl              easyCredit BBL               Germany
--   bsl              Türkiye Sigorta BSL          Turkey
--
-- Safe to re-run: ON CONFLICT DO UPDATE refreshes name/flag/country.
-- ============================================================

INSERT INTO leagues (key, name, flag, country, season, sport) VALUES

-- ── USA ────────────────────────────────────────────────────────────────── --
('nba',
 'NBA',
 '🇺🇸', 'USA',
 '2025-2026', 'basketball'),

-- ── Pan-European competitions ───────────────────────────────────────────── --
('euroleague',
 'EuroLeague',
 '🇪🇺', 'Europe',
 '2025-2026', 'basketball'),

('eurocup',
 'EuroCup',
 '🇪🇺', 'Europe',
 '2025-2026', 'basketball'),

('bcl',
 'Basketball Champions League',
 '🇪🇺', 'Europe',
 '2025-2026', 'basketball'),

-- ── National leagues ────────────────────────────────────────────────────── --
('acb',
 'Liga ACB',
 '🇪🇸', 'Spain',
 '2025-2026', 'basketball'),

('greece-bball',
 'Stoiximan GBL',
 '🇬🇷', 'Greece',
 '2025-2026', 'basketball'),

('lba',
 'Lega Basket Serie A',
 '🇮🇹', 'Italy',
 '2025-2026', 'basketball'),

('betclic-elite',
 'Betclic Élite',
 '🇫🇷', 'France',
 '2025-2026', 'basketball'),

('bbl',
 'easyCredit BBL',
 '🇩🇪', 'Germany',
 '2025-2026', 'basketball'),

('bsl',
 'Türkiye Sigorta BSL',
 '🇹🇷', 'Turkey',
 '2025-2026', 'basketball')

ON CONFLICT (key) DO UPDATE
  SET name    = EXCLUDED.name,
      flag    = EXCLUDED.flag,
      country = EXCLUDED.country,
      sport   = EXCLUDED.sport;

-- Verify
SELECT key, name, flag, country, sport
FROM   leagues
WHERE  sport = 'basketball'
ORDER BY
  CASE key
    WHEN 'nba'           THEN 1
    WHEN 'euroleague'    THEN 2
    WHEN 'eurocup'       THEN 3
    WHEN 'bcl'           THEN 4
    WHEN 'acb'           THEN 5
    WHEN 'greece-bball'  THEN 6
    WHEN 'lba'           THEN 7
    WHEN 'betclic-elite' THEN 8
    WHEN 'bbl'           THEN 9
    WHEN 'bsl'           THEN 10
    ELSE 99
  END;
