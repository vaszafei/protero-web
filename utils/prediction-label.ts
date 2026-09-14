/**
 * Canonical parser for a `predictions.prediction` code (masks.py action codes:
 * HOME_WIN / AWAY_WIN / DRAW / OVER_* / UNDER_* / SPREAD_COVER / …).
 *
 * Before this, `GameAnalysis.vue` and `GamePrediction.vue` each ran their own
 * `.toUpperCase()` pattern match against the same raw code — five separate
 * copies between the two — with different branch coverage (GameAnalysis never
 * matched AWAY_WIN via `.includes()` the way it matched HOME_WIN, so an
 * "AWAY_WIN" prediction highlighted no odds cell while GamePrediction still
 * labelled it correctly). One fixture, two derivations that could disagree.
 * This is the one place that decides what a prediction code MEANS; both
 * components use it and derive their own colors/labels from `side`/`market`.
 */

export type PredictionSide = 'home' | 'away' | 'draw' | 'over' | 'under' | 'spread' | null
export type PredictionMarket = 'moneyline' | 'total' | 'spread' | 'other'

export interface ParsedPrediction {
  side: PredictionSide
  market: PredictionMarket
  label: string
  raw: string | null
}

export interface ParsePredictionOpts {
  homeTeam?: string | null
  awayTeam?: string | null
  /** Basketball O/U line, when the fixture has one, to annotate Over/Under labels. */
  ouLine?: number | null
}

export function parsePrediction(
  code: string | null | undefined,
  opts: ParsePredictionOpts = {}
): ParsedPrediction {
  const raw = code ?? null
  if (!raw) return { side: null, market: 'other', label: '?', raw: null }

  // Normalize "Home Win" the same as "HOME_WIN" — audited against the 284
  // distinct codes actually in `predictions.prediction`; without this, "Home
  // Win"/"Away Win" (space, not underscore) fell through to the raw string
  // in both original components.
  const p = raw.toUpperCase().replace(/\s+/g, '_')
  const { homeTeam, awayTeam, ouLine } = opts

  // HOME_COVERS/AWAY_COVERS is basketball's spread-pick naming (distinct from
  // SPREAD_HOME/SPREAD_AWAY/SPREAD_COVER) — ~15% of the live basketball slate
  // and never matched by either original component (neither checked for
  // "COVERS"; GameAnalysis's own odds cells don't highlight on a spread pick
  // either way, so recognizing it here only fixes the label, not any cell).
  if (p.includes('SPREAD_COVER') || p.includes('SPREAD') || p.includes('HOME_COVERS')) {
    return { side: 'spread', market: 'spread', label: homeTeam ? `${homeTeam} Spread` : 'Spread Cover', raw }
  }
  if (p.includes('AWAY_COVERS')) {
    return { side: 'spread', market: 'spread', label: awayTeam ? `${awayTeam} Spread` : 'Spread Cover', raw }
  }
  // Loose match rather than an exact/prefix check: real prediction codes
  // carry a parenthetical ("OVER (Over 183.5 (shift +5))", "UNDER_2.5") that
  // a prefix check like `p === 'OVER'` never matched — both original
  // components silently fell through to the raw string for these, which is
  // most of the live basketball slate. But a bare `.includes` is not safe:
  // "SGP_HOME_ML+HOME_COVERS" contains "OVER" (cOVERs) and a team-name code
  // like "HOME_WIN (Oklahoma City Thunder ML)" contains "UNDER" (thUNDER) —
  // both would misclassify as a total market. Require OVER/UNDER not be
  // glued to another letter on either side (digits/underscores/parens are
  // fine, since "OVER_183.5" and "(OVER_..." must still match).
  if (/(?<![A-Z])OVER(?![A-Z])/.test(p)) {
    return { side: 'over', market: 'total', label: ouLine ? `Over ${ouLine}` : 'Over', raw }
  }
  if (/(?<![A-Z])UNDER(?![A-Z])/.test(p)) {
    return { side: 'under', market: 'total', label: ouLine ? `Under ${ouLine}` : 'Under', raw }
  }
  if (p === 'X' || p === 'DRAW') {
    return { side: 'draw', market: 'moneyline', label: 'Draw', raw }
  }
  if (p === '1' || p === 'HOME' || p === 'H' || p === 'ML_HOME' || p.includes('HOME_WIN')) {
    return { side: 'home', market: 'moneyline', label: homeTeam || 'Home', raw }
  }
  if (p === '2' || p === 'AWAY' || p === 'A' || p === 'ML_AWAY' || p.includes('AWAY_WIN')) {
    return { side: 'away', market: 'moneyline', label: awayTeam || 'Away', raw }
  }
  return { side: null, market: 'other', label: raw, raw }
}
