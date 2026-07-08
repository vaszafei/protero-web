-- ─────────────────────────────────────────────────────────────────────────
-- predictions calibration columns (Plan v2 Phase 2.1)
-- ─────────────────────────────────────────────────────────────────────────
-- CD #24: Every prediction row now carries a CALIBRATED probability (isotonic
-- per (league, market), retrained weekly on rolling 365d) AND a belief score
-- combining calibration quality, input completeness, ensemble agreement and
-- effective sample size.
--
-- Decisions (EV, stake) must use calibrated_prob, never the raw model output.
-- Raw probs (home_win_prob, etc.) stay for diagnostics + retraining input.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE predictions
    ADD COLUMN IF NOT EXISTS calibrated_prob   NUMERIC(7,4),
    ADD COLUMN IF NOT EXISTS belief_score      NUMERIC(5,4),
    ADD COLUMN IF NOT EXISTS model_agreement   NUMERIC(5,4),
    ADD COLUMN IF NOT EXISTS calibration_meta  JSONB;

COMMENT ON COLUMN predictions.calibrated_prob IS
    'Phase 2: probability after isotonic regression per (league_key, bet_type). '
    'Bounded [0,1]. Used for EV decisions instead of raw home_win_prob.';
COMMENT ON COLUMN predictions.belief_score IS
    'Phase 2: 0.40·calibration_quality + 0.25·input_completeness + 0.20·ensemble_agreement + 0.15·sample_size. Range [0,1].';
COMMENT ON COLUMN predictions.model_agreement IS
    'Phase 2: ensemble agreement across XGB/LGB/CAT — 1 - std(probs)/mean(probs). Range [0,1].';
COMMENT ON COLUMN predictions.calibration_meta IS
    'Phase 2: snapshot of {model_id, n_train, brier_train, retrained_at, market}.';

CREATE INDEX IF NOT EXISTS predictions_belief_idx
    ON predictions (belief_score DESC) WHERE belief_score IS NOT NULL;
