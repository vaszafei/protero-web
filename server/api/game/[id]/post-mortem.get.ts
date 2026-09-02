import { getSupabase } from '~/server/utils/supabase'
import { isEnabled, probSourceFor, disabledReason } from '~/server/utils/football-masks'

/**
 * The completed-fixture post-mortem: what we called, whether the call won, and
 * — the only question that generalises — whether our number was any better
 * than the market's.
 *
 * Three panels, in descending order of how much they can be trusted:
 *
 *   1. THE WAGER    `bets` for wallet 26 (football V6). A fact about money.
 *   2. LINE MOVE    `p_close − p_open` on the selection's own market, both
 *                   Shin-de-vigged (root CD #40). This is the project's own
 *                   CLV definition, lifted from `research/tipster/clv.py`:
 *                   de-vigged probabilities sum to 1 across a market, so the
 *                   movement is margin-free and a random selector scores
 *                   exactly 0 in expectation. `taken_price / close − 1` is NOT
 *                   used anywhere here — that measures book choice as much as
 *                   timing, which is the confound clv.py was written to avoid.
 *   3. BRIER        Our probability against the market's on the same outcome.
 *
 * On ONE fixture none of panels 2 and 3 is evidence, and the payload says so in
 * `caveat` rather than leaving the page to imply otherwise. The project's Phase
 * 3 result is that our sources are redundant to the price — DC earns a stack
 * weight of b=+0.000 (t=0.00) against the opening line over 34,010 fixtures —
 * so a single game in which DC beats the close is noise, and the panel exists
 * to show the wager honestly, not to relitigate that finding.
 *
 * Mirrored tipster wallets (W33-W47) are deliberately excluded: those are
 * somebody else's picks replayed at a flat 1.00, and nobody staked that money.
 */

/** `bets.bet_type` (+ line) → the `line_scores` market key for that selection. */
function marketKeyFor(betType: string, line: number | null): string | null {
  const t = (betType || '').toUpperCase()
  const direct: Record<string, string> = {
    HOME_WIN: 'home_win',
    AWAY_WIN: 'away_win',
    DRAW: 'draw',
    BTTS_YES: 'btts',
    BTTS_NO: 'btts_no',
  }
  if (direct[t]) return direct[t]
  // A totals wager is only identifiable with its line — an OVER_TOTAL with no
  // persisted line is unsettleable by the engine's own rule and gets no market.
  if (t === 'OVER_TOTAL' || t === 'UNDER_TOTAL') {
    if (line == null) return null
    const side = t === 'OVER_TOTAL' ? 'over' : 'under'
    const tag = { 1.5: '15', 2.5: '25', 3.5: '35' }[Number(line)]
    return tag ? `${side}_${tag}` : null
  }
  return null
}

const MARKET_LABEL: Record<string, string> = {
  home_win: 'Home win',
  draw: 'Draw',
  away_win: 'Away win',
  over_15: 'Over 1.5',
  over_25: 'Over 2.5',
  over_35: 'Over 3.5',
  under_15: 'Under 1.5',
  under_25: 'Under 2.5',
  under_35: 'Under 3.5',
  btts: 'Both teams score',
  btts_no: 'Both teams score — no',
}

/** Our probability sources, best first. `dc` is calibrated, `dc_raw` is not. */
const OUR_SOURCES = ['dc', 'gbm', 'dc_raw']
/** Price sources, sharpest first. */
const MARKET_SOURCES = ['close_avg', 'open_avg', 'book']

const toNum = (v: any): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export default defineEventHandler(async (event) => {
  const gameId = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(gameId)) {
    throw createError({ statusCode: 400, message: 'Numeric game id required' })
  }

  const supabase = getSupabase()

  const [gameRes, betRes, lsRes] = await Promise.all([
    supabase
      .from('games')
      .select('id, league_key, sport, status, home_goals, away_goals')
      .eq('id', gameId)
      .maybeSingle(),
    // Our own picker only. `strategy` is `<league>_football_v6_aif`; matching on
    // the suffix rather than the wallet id keeps this correct if the roster
    // moves again (CD #35 already moved it once).
    supabase
      .from('bets')
      .select('id, wallet_id, bet_type, line, odds, stake, status, profit, calibrated_prob, predicted_prob, expected_value, strategy, settled_by, placed_at, notes')
      .eq('game_id', gameId)
      .like('strategy', '%_football_v6_aif')
      .order('id', { ascending: true }),
    supabase
      .from('line_scores')
      .select('market, source, prob, line, outcome, grade_status, brier, devig')
      .eq('game_id', gameId),
  ])

  // Fail loud. A swallowed PostgREST error rendering as an empty panel is the
  // documented failure mode this app has already paid for twice.
  for (const [name, res] of [['games', gameRes], ['bets', betRes], ['line_scores', lsRes]] as const) {
    if (res.error) {
      throw createError({ statusCode: 500, message: `${name} query failed: ${res.error.message}` })
    }
  }

  const game: any = gameRes.data
  if (!game) throw createError({ statusCode: 404, message: 'Game not found' })

  const leagueKey: string = game.league_key
  const rows = (lsRes.data || []) as any[]

  /** market → source → row, for the sources we score with. */
  const bySource = new Map<string, Map<string, any>>()
  for (const r of rows) {
    if (!bySource.has(r.market)) bySource.set(r.market, new Map())
    bySource.get(r.market)!.set(r.source, r)
  }
  const pick = (market: string, order: string[]) => {
    const m = bySource.get(market)
    if (!m) return null
    for (const s of order) {
      const r = m.get(s)
      if (r && toNum(r.prob) != null) return r
    }
    return null
  }

  // ── 1. The wagers ────────────────────────────────────────────────────────
  const wagers = ((betRes.data || []) as any[]).map((b) => {
    const line = toNum(b.line)
    const market = marketKeyFor(b.bet_type, line)
    let selection: string | null = null
    try {
      const n = typeof b.notes === 'string' ? JSON.parse(b.notes) : b.notes
      selection = n?.selection ?? null
    } catch {
      selection = null
    }
    const enabled = market ? isEnabled(leagueKey, market) : false
    return {
      id: b.id,
      wallet_id: b.wallet_id,
      bet_type: b.bet_type,
      market,
      market_label: market ? MARKET_LABEL[market] ?? market : null,
      selection,
      line,
      odds: toNum(b.odds),
      stake: toNum(b.stake),
      status: b.status,
      profit: toNum(b.profit),
      // The picker's calibrated probability is the number it staked on.
      ours: toNum(b.calibrated_prob),
      expected_value: toNum(b.expected_value),
      settled_by: b.settled_by,
      placed_at: b.placed_at,
      enabled,
      prob_source: market ? probSourceFor(leagueKey, market) : null,
      disabled_note: market && !enabled ? disabledReason(leagueKey, market) : null,
    }
  })

  // ── 2. Line movement on each wagered market ──────────────────────────────
  // dp = p_close − p_open on the selection itself. Margin-free by construction.
  const clv = wagers
    .filter((w) => w.market)
    .map((w) => {
      const open = bySource.get(w.market!)?.get('open_avg')
      const close = bySource.get(w.market!)?.get('close_avg')
      const pOpen = open ? toNum(open.prob) : null
      const pClose = close ? toNum(close.prob) : null
      return {
        market: w.market!,
        label: w.market_label,
        open: pOpen,
        close: pClose,
        dp: pOpen != null && pClose != null ? pClose - pOpen : null,
        devig: close?.devig ?? open?.devig ?? null,
      }
    })
    .filter((c) => c.dp != null)

  // ── 3. Our number vs the market's, per market ────────────────────────────
  // Only markets our models actually price (the seven `write_model` writes).
  const scores: any[] = []
  for (const market of Array.from(bySource.keys())) {
    const ourRow = pick(market, OUR_SOURCES)
    const mktRow = pick(market, MARKET_SOURCES)
    if (!ourRow || !mktRow) continue
    if (ourRow.grade_status !== 'graded' || mktRow.grade_status !== 'graded') continue
    const outcome = ourRow.outcome ?? mktRow.outcome
    if (outcome == null) continue
    const ourBrier = toNum(ourRow.brier)
    const mktBrier = toNum(mktRow.brier)
    scores.push({
      market,
      label: MARKET_LABEL[market] ?? market,
      ours: toNum(ourRow.prob),
      our_source: ourRow.source,
      our_brier: ourBrier,
      market_prob: toNum(mktRow.prob),
      market_source: mktRow.source,
      market_brier: mktBrier,
      devig: mktRow.devig ?? null,
      outcome: Number(outcome),
      // Lower Brier is better. Null when either side is ungraded.
      beat_market: ourBrier != null && mktBrier != null ? ourBrier < mktBrier : null,
      enabled: isEnabled(leagueKey, market),
      wagered: wagers.some((w) => w.market === market),
    })
  }
  scores.sort((a, b) => {
    if (a.wagered !== b.wagered) return a.wagered ? -1 : 1
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1
    return a.label.localeCompare(b.label)
  })

  /**
   * When a fixture carries no model rows at all, say why instead of rendering
   * an empty table. `ml.line_scores.write_model` is NOT a pipeline step — step
   * 5.85 runs `ingest_close` / `write_book` / `write_close` / `grade` only — so
   * the model side of the spine stops wherever it was last run by hand, and the
   * gap grows every day. That is a fact about our cadence, not about the game.
   */
  let model_coverage: { has_rows: boolean; last_written: string | null; note: string | null } = {
    has_rows: scores.length > 0,
    last_written: null,
    note: null,
  }
  if (scores.length === 0) {
    const { data: lastRow } = await supabase
      .from('line_scores')
      .select('match_date')
      .in('source', ['dc', 'gbm'])
      .order('match_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    model_coverage.last_written = (lastRow as any)?.match_date ?? null
    model_coverage.note = model_coverage.last_written
      ? `Our probability was never written for this fixture. \`ml.line_scores.write_model\` is not a pipeline step — the model side of the spine ends at ${model_coverage.last_written} and has to be re-run by hand.`
      : 'Our probability was never written for this fixture.'
  }

  return {
    game_id: gameId,
    league_key: leagueKey,
    status: game.status,
    score: game.home_goals != null && game.away_goals != null
      ? { home: Number(game.home_goals), away: Number(game.away_goals) }
      : null,
    wagers,
    clv,
    scores,
    model_coverage,
    // One fixture is one draw from a distribution whose mean this project has
    // already measured. The page must not read as a scoreboard.
    caveat: 'One fixture is not evidence. Across 34,010 fixtures our probability adds nothing to the price (b=+0.000, t=0.00 against the opening line) — a game where we beat the close is noise, not skill.',
  }
})
