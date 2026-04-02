-- ================================================
-- DISABLE RLS FOR MIGRATION
-- ================================================
-- Run this in Supabase SQL Editor before migrating data
-- Re-enable RLS after migration is complete

-- Disable RLS on all tables
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE lineups DISABLE ROW LEVEL SECURITY;
ALTER TABLE model_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE predictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE bets DISABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_performance DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Public read access for teams" ON teams;
DROP POLICY IF EXISTS "Public read access for games" ON games;
DROP POLICY IF EXISTS "Public read access for predictions" ON predictions;
DROP POLICY IF EXISTS "Public read access for model_versions" ON model_versions;
DROP POLICY IF EXISTS "Authenticated users can read wallets" ON wallets;
DROP POLICY IF EXISTS "Authenticated users can read bets" ON bets;
DROP POLICY IF EXISTS "Admins can insert/update teams" ON teams;
DROP POLICY IF EXISTS "Admins can insert/update games" ON games;
DROP POLICY IF EXISTS "Admins can insert/update predictions" ON predictions;

-- Confirm RLS is disabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('teams', 'games', 'lineups', 'model_versions', 'predictions', 'wallets', 'bets', 'strategy_performance', 'users', 'sessions')
ORDER BY tablename;
