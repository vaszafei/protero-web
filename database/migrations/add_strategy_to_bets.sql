-- ================================================
-- ADD STRATEGY TRACKING TO BETS
-- ================================================
-- Purpose: Track which betting strategy placed each bet
-- Date: February 5, 2026
-- Description: Adds strategy column and indexes for performance tracking

-- Add strategy column to bets table
ALTER TABLE bets 
ADD COLUMN IF NOT EXISTS strategy TEXT DEFAULT 'v18_kelly';

-- Add comment explaining strategy values
COMMENT ON COLUMN bets.strategy IS 'Betting strategy used: v18_kelly, v18_conservative, v18_aggressive, parlay, manual, etc.';

-- Create index for strategy-based queries
CREATE INDEX IF NOT EXISTS idx_bets_strategy ON bets(strategy);

-- Create index for wallet + strategy queries
CREATE INDEX IF NOT EXISTS idx_bets_wallet_strategy ON bets(wallet_id, strategy);

-- Update existing bets to have default strategy
UPDATE bets 
SET strategy = 'v18_kelly' 
WHERE strategy IS NULL;

-- Add strategy to strategy_performance table if needed
ALTER TABLE strategy_performance
ADD COLUMN IF NOT EXISTS bet_count_by_type JSONB;

COMMENT ON COLUMN strategy_performance.bet_count_by_type IS 'Breakdown of bet types: {"OVER_25": 50, "HOME": 30, ...}';

-- Example query to analyze strategy performance
-- SELECT 
--   strategy,
--   COUNT(*) as total_bets,
--   SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as wins,
--   ROUND(AVG(CASE WHEN status = 'won' THEN 1.0 ELSE 0.0 END) * 100, 2) as win_rate_pct,
--   SUM(stake) as total_staked,
--   SUM(profit) as total_profit,
--   ROUND((SUM(profit) / NULLIF(SUM(stake), 0)) * 100, 2) as roi_pct
-- FROM bets
-- WHERE wallet_id = 1
-- GROUP BY strategy
-- ORDER BY total_profit DESC;
