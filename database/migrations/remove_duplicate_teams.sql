-- Remove duplicate team entries
-- All these teams have 0 games associated, so safe to delete
-- Keeping the teams with most games or highest league priority

-- Summary of teams being removed:
-- Ajax: Remove IDs 220, 240, 205, 231 (Keep 161 - champions_league, 22 games)
-- Pafos: Remove IDs 238, 218, 190, 229 (Keep 160 - champions_league, 8 games)
-- Panathinaikos: Remove IDs 219, 204, 239, 230 (Keep 424 - greek_super_league, 65 games)
-- Panevėžys: Remove IDs 211, 233, 242, 222 (Keep 1 - champions_league)
-- Petrocub: Remove IDs 223, 212, 234, 243 (Keep 14 - champions_league, 2 games)
-- Rīgas FS: Remove IDs 237, 226, 217 (Keep 19 - champions_league, 10 games)
-- SC Braga: Remove IDs 241, 209, 221, 232 (Keep 309 - liga_portugal, 86 games)
-- The New Saints: Remove IDs 224, 213, 235 (Keep 5 - champions_league)
-- UE Santa Coloma: Remove IDs 216, 225, 236 (Keep 7 - champions_league)

DELETE FROM teams WHERE id IN (
  -- Ajax duplicates
  220, 240, 205, 231,
  -- Pafos duplicates
  238, 218, 190, 229,
  -- Panathinaikos duplicates
  219, 204, 239, 230,
  -- Panevėžys duplicates
  211, 233, 242, 222,
  -- Petrocub duplicates
  223, 212, 234, 243,
  -- Rīgas FS duplicates
  237, 226, 217,
  -- SC Braga duplicates
  241, 209, 221, 232,
  -- The New Saints duplicates
  224, 213, 235,
  -- UE Santa Coloma duplicates
  216, 225, 236
);

-- Verify deletion count (should be 33)
-- SELECT COUNT(*) as deleted_count FROM teams WHERE id IN (...);

-- Verify no duplicates remain
SELECT name, COUNT(*) as count
FROM teams
GROUP BY name
HAVING COUNT(*) > 1;
