-- ─────────────────────────────────────────────────────────────────────────
-- market_calibration — fitted isotonic regressions per (league, bet_type)
-- ─────────────────────────────────────────────────────────────────────────
-- Phase 2.3: persists the isotonic step function (knots_x, knots_y) so the
-- production picker can map raw_prob → calibrated_prob without rebuilding
-- the model on every run. Retrained weekly on rolling 365d of (predicted_prob,
-- result_correct) pairs.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS market_calibration (
    league_key     TEXT NOT NULL,
    bet_type       TEXT NOT NULL,

    -- Step function: arrays of equal length. Lookup = step on knots_x.
    knots_x        NUMERIC[] NOT NULL,
    knots_y        NUMERIC[] NOT NULL,

    -- Diagnostics from training run.
    n_train        INT     NOT NULL,
    brier_raw      NUMERIC NOT NULL,
    brier_calib    NUMERIC NOT NULL,
    log_loss_raw   NUMERIC,
    log_loss_calib NUMERIC,

    fitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (league_key, bet_type)
);

CREATE INDEX IF NOT EXISTS market_calibration_fitted_idx
    ON market_calibration (fitted_at DESC);

COMMENT ON TABLE market_calibration IS
    'Phase 2.3 — Persisted isotonic regression per (league, bet_type). '
    'Retrained weekly on rolling 365d. Read by ml.v6.calibration at predict time.';
