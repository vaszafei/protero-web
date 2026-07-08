-- ─────────────────────────────────────────────────────────────────────────
-- market_posterior — Beta-Binomial posterior per (league, bet_type)
-- ─────────────────────────────────────────────────────────────────────────
-- CD #23 (May 2 2026): NO market killing. Instead, every (league, bet_type)
-- carries a Beta-Binomial belief over win probability and an exponential-decay
-- ROI estimate. The stake_multiplier in [0.02, 1.00] shrinks bad markets to
-- exploration-only (~€0.10) without removing them. As regimes shift the
-- multiplier recovers automatically.
--
-- Schema is local-only research data. Cloud bets table stays unchanged.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS market_posterior (
    league_key       TEXT    NOT NULL,
    bet_type         TEXT    NOT NULL,

    -- Posterior Beta(alpha, beta) over win probability.
    -- alpha = prior_alpha + Σ decay_w_i · 1{won_i}
    -- beta  = prior_beta  + Σ decay_w_i · 1{lost_i}
    alpha            NUMERIC NOT NULL DEFAULT 1.0,
    beta             NUMERIC NOT NULL DEFAULT 1.0,

    -- Prior parameters (set when posterior is first created; preserved through
    -- updates so we can always reset to the prior or measure shrinkage).
    alpha_prior      NUMERIC NOT NULL DEFAULT 1.0,
    beta_prior       NUMERIC NOT NULL DEFAULT 1.0,

    -- Exponential-decay ROI estimate, λ=0.97/day. roi_hat ∈ [-1, ~+5].
    roi_hat          NUMERIC NOT NULL DEFAULT 0.0,
    avg_odds         NUMERIC NOT NULL DEFAULT 2.0,

    -- Stake multiplier derived from roi_hat curve (CD #23). Range [0.02, 1.00].
    stake_multiplier NUMERIC NOT NULL DEFAULT 0.50,

    -- Effective sample sizes (live = decay-weighted observations).
    n_live           NUMERIC NOT NULL DEFAULT 0.0,
    n_prior          INT     NOT NULL DEFAULT 0,

    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (league_key, bet_type)
);

CREATE INDEX IF NOT EXISTS market_posterior_updated_idx
    ON market_posterior (updated_at DESC);

COMMENT ON TABLE market_posterior IS
    'CD #23 — Beta-Binomial posterior per (league, bet_type) with exponential '
    'decay (λ=0.97/day). Drives stake_multiplier; never disables a market.';
