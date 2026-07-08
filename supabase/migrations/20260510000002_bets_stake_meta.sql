-- ─────────────────────────────────────────────────────────────────────────
-- bets stake-meta columns (Plan v2 Phase 2.2)
-- ─────────────────────────────────────────────────────────────────────────
-- CD #23: every bet records the posterior multiplier and (for parlays) the
-- AIF score + average pairwise correlation that produced the stake. Lets
-- post-hoc analysis attribute live ROI moves back to (a) the posterior
-- shrinking, (b) AIF gating, or (c) calibration drift.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE bets
    ADD COLUMN IF NOT EXISTS stake_multiplier  NUMERIC(5,4),
    ADD COLUMN IF NOT EXISTS belief_score      NUMERIC(5,4),
    ADD COLUMN IF NOT EXISTS calibrated_prob   NUMERIC(7,4),
    ADD COLUMN IF NOT EXISTS parlay_aif        NUMERIC(8,4),
    ADD COLUMN IF NOT EXISTS parlay_corr_avg   NUMERIC(5,4);

COMMENT ON COLUMN bets.stake_multiplier IS
    'Phase 2: market_posterior.stake_multiplier applied at bet time. Range [0.02,1.00].';
COMMENT ON COLUMN bets.belief_score IS
    'Phase 2: snapshot of predictions.belief_score at bet time.';
COMMENT ON COLUMN bets.calibrated_prob IS
    'Phase 2: snapshot of calibrated probability at bet time (for EV audit).';
COMMENT ON COLUMN bets.parlay_aif IS
    'Phase 2: AIF score that approved this parlay. NULL for singles.';
COMMENT ON COLUMN bets.parlay_corr_avg IS
    'Phase 2: average pairwise leg correlation. NULL for singles.';
