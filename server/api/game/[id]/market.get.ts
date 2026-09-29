import { getSupabase } from '~/server/utils/supabase'
import { isEnabled, probSourceFor, disabledReason } from '~/server/utils/football-masks'
import { fitImpliedGoals, bookMargin } from '~/server/utils/market-implied'

/**
 * The market board for one fixture: what the book thinks, what we think, and
 * whether the difference is something this project is allowed to call an edge.
 *
 * Sources, in the order they are trusted:
 *   MARKET  `line_scores` rows for this game. These are already Shin-de-vigged
 *           (root CD #40) — comparing our probability with a raw implied
 *           probability off the price would overstate every difference by
 *           roughly half the vig. `close_avg` is the accuracy frontier and
 *           `open_avg` a price that was actually available; `book` is our own
 *           scraped price and is the only source present before kick-off.
 *   OURS    `predictions`, which carries per-market probabilities as integer
 *           percentages.
 *
 * The mask decides the LABEL, never the number. A difference on a cell
 * `masks.py` does not enable is still shown — it is a fact — but it is not
 * called an edge, because there is no holdout evidence that it is real. The
 * project's own Phase 3 finding is that our probability sources are redundant
 * to the price (b=+0.000 against the open, t=0.00), so rendering every
 * disagreement as an edge would be actively misleading.
 */

/** Market key → the `predictions` column holding our probability, as a %. */
const OUR_PROB_COLUMN: Record<string, string> = {
  home_win: 'home_win_prob',
  draw: 'draw_prob',
  away_win: 'away_win_prob',
  over_25: 'over25_prob',
  under_25: 'under25_prob',
  btts: 'btts_prob',
}

/** Display order and labels. Anything not listed is not rendered. */
const MARKETS: { key: string; label: string; group: string }[] = [
  { key: 'home_win', label: 'Home win', group: '1X2' },
  { key: 'draw', label: 'Draw', group: '1X2' },
  { key: 'away_win', label: 'Away win', group: '1X2' },
  { key: 'dc_1x', label: 'Home or draw', group: 'Double chance' },
  { key: 'dc_12', label: 'Home or away', group: 'Double chance' },
  { key: 'dc_x2', label: 'Draw or away', group: 'Double chance' },
  { key: 'over_15', label: 'Over 1.5', group: 'Total goals' },
  { key: 'under_15', label: 'Under 1.5', group: 'Total goals' },
  { key: 'over_25', label: 'Over 2.5', group: 'Total goals' },
  { key: 'under_25', label: 'Under 2.5', group: 'Total goals' },
  { key: 'over_35', label: 'Over 3.5', group: 'Total goals' },
  { key: 'under_35', label: 'Under 3.5', group: 'Total goals' },
  { key: 'btts', label: 'Both teams score', group: 'Both teams to score' },
  { key: 'btts_no', label: 'No', group: 'Both teams to score' },
]

/** The decimal price on `games` for a market, where one is stored. */
const ODDS_COLUMN: Record<string, string> = {
  home_win: 'odds_home',
  draw: 'odds_draw',
  away_win: 'odds_away',
  over_15: 'odds_over_15',
  under_15: 'odds_under_15',
  over_25: 'odds_over_25',
  under_25: 'odds_under_25',
  over_35: 'odds_over_35',
  under_35: 'odds_under_35',
  btts: 'odds_btts_yes',
  btts_no: 'odds_btts_no',
  dc_1x: 'odds_dc_1x',
  dc_12: 'odds_dc_12',
  dc_x2: 'odds_dc_x2',
}

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

  const [gameRes, lsRes, predRes, betsRes] = await Promise.all([
    supabase
      .from('games')
      .select(
        'id, league_key, sport, status, ' +
        Object.values(ODDS_COLUMN).join(', ')
      )
      .eq('id', gameId)
      .maybeSingle(),
    supabase
      .from('line_scores')
      .select('market, source, prob, devig')
      .eq('game_id', gameId),
    supabase
      .from('predictions')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .limit(1),
    // Every wager on this fixture, singles and parlay legs alike — the page
    // labels which is which and whose (mirrors are not our money).
    supabase
      .from('bets')
      .select('id, wallet_id, bet_type, line, odds, stake, status, profit, placed_at, notes, wallets(persona_name, name, archetype)')
      .eq('game_id', gameId)
      .order('placed_at', { ascending: false }),
  ])

  // Fail loud — a swallowed PostgREST error rendering as an empty board is the
  // documented failure mode this app has already paid for twice.
  for (const [name, res] of [['games', gameRes], ['line_scores', lsRes], ['predictions', predRes], ['bets', betsRes]] as const) {
    if (res.error) {
      throw createError({ statusCode: 500, message: `${name} query failed: ${res.error.message}` })
    }
  }

  const game: any = gameRes.data
  if (!game) throw createError({ statusCode: 404, message: 'Game not found' })

  const leagueKey: string = game.league_key
  const prediction: any = (predRes.data || [])[0] || null

  /**
   * Collapse `line_scores` to one market probability per market. Preference is
   * accuracy first: the close is the sharpest number, the open is the one that
   * was actually available, our scraped book price is the fallback and the only
   * one present before kick-off.
   */
  const PREFERENCE = ['close_avg', 'open_avg', 'book']
  const marketProb = new Map<string, { prob: number; source: string; devig: string | null }>()
  for (const r of (lsRes.data || []) as any[]) {
    const p = toNum(r.prob)
    if (p == null) continue
    const rank = PREFERENCE.indexOf(r.source)
    if (rank < 0) continue
    const held = marketProb.get(r.market)
    if (!held || rank < PREFERENCE.indexOf(held.source)) {
      marketProb.set(r.market, { prob: p, source: r.source, devig: r.devig ?? null })
    }
  }

  const rows = MARKETS.map((m) => {
    const mkt = marketProb.get(m.key) || null
    const col = OUR_PROB_COLUMN[m.key]
    // `predictions` stores these as integer percentages.
    const oursPct = col && prediction ? toNum(prediction[col]) : null
    const ours = oursPct == null ? null : oursPct / 100
    const enabled = isEnabled(leagueKey, m.key)

    return {
      ...m,
      market: mkt?.prob ?? null,
      fairOdds: mkt?.prob ? Number((1 / mkt.prob).toFixed(2)) : null,
      marketSource: mkt?.source ?? null,
      devig: mkt?.devig ?? null,
      price: toNum(game[ODDS_COLUMN[m.key]]),
      ours,
      enabled,
      ourLabel: probSourceFor(leagueKey, m.key) === 'gbm'
        ? 'GBM'
        : probSourceFor(leagueKey, m.key) === 'dc'
          ? 'Dixon-Coles'
          : 'model',
      disabledNote: enabled ? null : disabledReason(leagueKey, m.key),
    }
  }).filter((r) => r.market != null || r.price != null)

  const marketOf = (k: string) => marketProb.get(k)?.prob ?? null
  const priceOf = (k: string) => toNum(game[ODDS_COLUMN[k]])

  /** Margin per group, off the prices — which market is cheapest to bet. */
  const margins: Record<string, number | null> = {
    '1X2': bookMargin(['home_win', 'draw', 'away_win'].map(priceOf)),
    'Double chance': bookMargin(['dc_1x', 'dc_12', 'dc_x2'].map(priceOf), 2),
    'Over/Under 1.5': bookMargin(['over_15', 'under_15'].map(priceOf)),
    'Over/Under 2.5': bookMargin(['over_25', 'under_25'].map(priceOf)),
    'Over/Under 3.5': bookMargin(['over_35', 'under_35'].map(priceOf)),
    'Both teams to score': bookMargin(['btts', 'btts_no'].map(priceOf)),
  }

  const implied = fitImpliedGoals(Object.fromEntries(
    ['home_win', 'draw', 'away_win', 'over_15', 'over_25', 'over_35', 'btts'].map((k) => [k, marketOf(k)]),
  ) as Record<string, number>)

  // The V6 writer stores model_details as a JSON string inside jsonb.
  let details: any = prediction?.model_details ?? null
  if (typeof details === 'string') {
    try { details = JSON.parse(details) } catch { details = null }
  }
  const candidates = (Array.isArray(details?.all_bets) ? details.all_bets : details ? [details] : [])
    .filter((b: any) => b && b.market)
    .map((b: any) => ({
      market: String(b.market),
      selection: b.selection ?? null,
      line: toNum(b.line),
      model_prob: toNum(b.model_prob),
      // Raw 1/odds as the picker saw it — NOT de-vigged. The de-vigged
      // market number for the same key is `market_prob`.
      implied_prob: toNum(b.implied_prob),
      market_prob: marketOf(String(b.market)),
      decimal_odds: toNum(b.decimal_odds),
      enabled: isEnabled(leagueKey, String(b.market)),
    }))

  // A bet listed in parlay_legs is a LEG of a slip, not a wager (root CLAUDE.md);
  // ask the table, never infer it from the wallet.
  const betRows = (betsRes.data || []) as any[]
  const legOf = new Map<number, { parlay_id: number; num_legs: number | null; parlay_odds: number | null }>()
  if (betRows.length) {
    const legRes = await supabase
      .from('parlay_legs')
      .select('bet_id, parlay_id, parlays(num_legs, parlay_odds)')
      .in('bet_id', betRows.map((b) => b.id))
    if (legRes.error) throw createError({ statusCode: 500, message: `parlay_legs query failed: ${legRes.error.message}` })
    for (const l of (legRes.data || []) as any[]) {
      legOf.set(Number(l.bet_id), {
        parlay_id: Number(l.parlay_id),
        num_legs: toNum(l.parlays?.num_legs),
        parlay_odds: toNum(l.parlays?.parlay_odds),
      })
    }
  }

  const wagers = betRows.map((b) => {
    // Prop bets carry the player and the analyst's reasoning in notes (JSON text).
    let n: any = b.notes
    if (typeof n === 'string') {
      try { n = JSON.parse(n) } catch { n = null }
    }
    return {
    id: b.id,
    wallet_id: b.wallet_id,
    wallet: b.wallets?.persona_name || b.wallets?.name || `W${b.wallet_id}`,
    // external_tipster / user_mirror replay someone else's record — the page
    // must never present those as our wagers.
    archetype: b.wallets?.archetype ?? null,
    bet_type: b.bet_type,
    line: toNum(b.line),
    odds: toNum(b.odds),
    stake: toNum(b.stake),
    status: b.status,
    profit: toNum(b.profit),
    placed_at: b.placed_at,
    player: n?.player ?? null,
    prop_market: n?.market ?? null,
    direction: n?.direction ?? null,
    p_hit: toNum(n?.p_hit),
    analysis: typeof n?.analysis === 'string' ? n.analysis : null,
    slip: legOf.get(Number(b.id)) ?? null,
    }
  })

  return {
    game_id: gameId,
    league_key: leagueKey,
    status: game.status,
    margins,
    implied,
    pick: prediction
      ? {
          prediction: prediction.prediction,
          model_version: prediction.model_version,
          // Stored as fractions by every current writer (V6: EV per unit
          // staked, so 1.36 = +136 %). Never guess the unit from magnitude.
          expected_value: toNum(prediction.expected_value),
          kelly_fraction: toNum(prediction.kelly_percentage),
          candidates,
        }
      : null,
    wagers,
    // Which of the three price bases actually backed this board, so the page
    // can say so rather than implying it compared against the close.
    basis: rows.find((r) => r.marketSource)?.marketSource ?? null,
    has_model: !!prediction,
    model_version: prediction?.model_version ?? null,
    enabled_markets: Object.keys(marketProb).length
      ? MARKETS.filter((m) => isEnabled(leagueKey, m.key)).map((m) => m.key)
      : [],
    rows,
  }
})
