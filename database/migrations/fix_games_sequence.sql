-- Fix the games ID sequence to match the max ID
SELECT setval('games_id_seq', (SELECT MAX(id) FROM games) + 1, false);

-- Fix the teams ID sequence to match the max ID
SELECT setval('teams_id_seq', (SELECT MAX(id) FROM teams) + 1, false);
