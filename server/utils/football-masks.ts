/**
 * Mirror of `protero-ml/ml/v6/masks.py` — which (league, market) cells the
 * football V6 picker is allowed to bet.
 *
 * ⚠️ masks.py IS THE SOURCE OF TRUTH. This file exists so the game page can say
 * "not bet — no holdout evidence for this cell" honestly, and it must be kept
 * in sync by hand, exactly like `WALLET_MODEL_MAP` (server) and
 * `utils/wallet-meta.ts` (client) already are.
 *
 * Nothing here gates money. No stake, no bet and no settlement reads this file
 * — it only decides whether the UI is allowed to call a probability difference
 * an EDGE. Drift makes a label wrong, never a wager.
 *
 * Transcribed 2026-09-02 from masks.py `LEAGUE_ENABLED_ACTIONS` +
 * `MARKET_PROB_SOURCE` (verdict of the 2026-08-21 refresh-to-evidence:
 * **13 combos / 9 leagues, 10 DC + 3 GBM**, root CD #3).
 *
 * The action codes in masks.py are:
 *   1 OVER_1.5   2 OVER_2.5   3 OVER_3.5
 *   4 UNDER_1.5  5 UNDER_2.5  6 UNDER_3.5
 *   7 HOME_WIN   8 AWAY_WIN   9 DRAW
 *  10 BTTS_YES  11 BTTS_NO   12-14 double chance (wired, granted nowhere)
 */

/** market key → which model prices it, for the cells that are enabled. */
export type ProbSource = 'dc' | 'gbm'

export const LEAGUE_ENABLED_MARKETS: Record<string, Record<string, ProbSource>> = {
  premier_league: { away_win: 'gbm' },
  serie_a: { away_win: 'dc' },
  la_liga: { over_15: 'dc', draw: 'dc', home_win: 'gbm' },
  bundesliga: { over_35: 'dc' },
  ligue_1: { home_win: 'gbm' },
  liga_portugal: { draw: 'dc' },
  eredivisie: { over_35: 'dc', home_win: 'dc' },
  ligue_2: { over_25: 'dc', away_win: 'dc' },
  super_lig: { over_35: 'dc' },

  // Explicit empty sets in masks.py, not missing keys: "an empty set is a
  // decision, a missing key is an accident."
  championship: {},
  la_liga_2: {},
  bundesliga_2: {},
  greek_super_league: {},
  serie_b: {},
}

/**
 * Cells that PASSED the holdout ROI gates and were removed anyway, because the
 * market itself carries no predictable signal — the closing line's own Brier
 * Skill Score against the base rate is at or below the +0.02 ceiling. Rendered
 * as a distinct reason, because "we can't beat this market" and "we have no
 * evidence yet" are different statements.
 *
 * Value is the measured ceiling from masks.py `CEILING_REMOVED`.
 */
export const CEILING_REMOVED: Record<string, Record<string, number>> = {
  serie_a: { over_25: -0.0219, over_35: -0.0097 },
  bundesliga: { draw: 0.0102 },
  liga_portugal: { over_35: -0.0016, over_15: 0.0184 },
  bundesliga_2: { draw: -0.0 },
  greek_super_league: { over_25: -0.0006 },
  serie_b: { over_15: -0.0015 },
}

export function isEnabled(leagueKey: string, market: string): boolean {
  return !!LEAGUE_ENABLED_MARKETS[leagueKey]?.[market]
}

export function probSourceFor(leagueKey: string, market: string): ProbSource | null {
  return LEAGUE_ENABLED_MARKETS[leagueKey]?.[market] ?? null
}

/** Why a cell is not bet — the honest label for the UI. */
export function disabledReason(leagueKey: string, market: string): string {
  const ceiling = CEILING_REMOVED[leagueKey]?.[market]
  if (ceiling != null) {
    return `not bet — the market itself has no signal (close's own BSS ${ceiling >= 0 ? '+' : ''}${ceiling.toFixed(4)}, at or below the +0.02 ceiling)`
  }
  if (!(leagueKey in LEAGUE_ENABLED_MARKETS)) {
    return 'not bet — this competition is not modelled (data collection only)'
  }
  return 'not bet — no holdout evidence for this cell'
}

/** Every enabled cell, flattened — `[{ league_key, market, source }, …]`. */
export function enabledCells(): { league_key: string; market: string; source: ProbSource }[] {
  const out: { league_key: string; market: string; source: ProbSource }[] = []
  for (const [league_key, markets] of Object.entries(LEAGUE_ENABLED_MARKETS)) {
    for (const [market, source] of Object.entries(markets)) {
      out.push({ league_key, market, source })
    }
  }
  return out
}
