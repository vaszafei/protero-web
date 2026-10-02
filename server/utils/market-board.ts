import type { SupabaseClient } from '@supabase/supabase-js'
import { isEnabled, probSourceFor, disabledReason, LEAGUE_ENABLED_MARKETS, BASKETBALL_ENABLED_ACTIONS } from '~/server/utils/football-masks'
import { fitImpliedGoals, bookMargin } from '~/server/utils/market-implied'
import { summariseBases } from '~/utils/market-basis'

/**
 * The market board: what the book thinks, what we think, and whether the difference is
 * something this project is allowed to call an edge.
 *
 * ONE implementation, two callers — `GET /api/game/[id]/market` (one fixture) and
 * `GET /api/league/[key]/round-board` (a round). They used to be one endpoint and a pile of
 * client-side arithmetic over fifty requests; two code paths over the same board is how a row
 * on the league tab and the same fixture's Market tab come to disagree. Everything here is
 * pure except `fetchBoardInputs`, which is one `.in()` per table however many fixtures it is given.
 *
 * Sources, in the order they are trusted:
 *   MARKET  `line_scores` rows for the game. Already Shin-de-vigged (root CD #40) — comparing
 *           our probability with a raw implied probability off the price would overstate every
 *           difference by roughly half the vig. `close_avg` is the accuracy frontier and
 *           `open_avg` a price that was actually available; `book` is our own scraped price and
 *           the only source present before kick-off.
 *   OURS    `predictions`, which carries per-market probabilities as integer percentages.
 *
 * The mask decides the LABEL, never the number. A difference on a cell `masks.py` does not
 * enable is still shown — it is a fact — but it is not called an edge, because there is no
 * holdout evidence that it is real. The project's own Phase 3 finding is that our probability
 * sources are redundant to the price (b=+0.000 against the open, t=0.00).
 */

/** PostgREST caps a response at db-max-rows (1000 in config.toml). */
const DB_MAX_ROWS = 1000

/** Market key → the `predictions` column holding our probability, as a %. */
export const OUR_PROB_COLUMN: Record<string, string> = {
  home_win: 'home_win_prob',
  draw: 'draw_prob',
  away_win: 'away_win_prob',
  over_25: 'over25_prob',
  under_25: 'under25_prob',
  btts: 'btts_prob',
}

/** Display order and labels. Anything not listed is not rendered. */
export const MARKETS: { key: string; label: string; group: string }[] = [
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
export const ODDS_COLUMN: Record<string, string> = {
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

export const PREFERENCE = ['close_avg', 'open_avg', 'book']

const PIPELINE_AT: Record<string, string> = { football: '09:00', basketball: '11:00' }

const toNum = (v: any): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Fail loud: a swallowed PostgREST error rendering as an empty board is a failure this app has paid for twice. */
function must<T extends { error: any; data: any }>(name: string, res: T): T {
  if (res.error) throw createError({ statusCode: 500, message: `${name} query failed: ${res.error.message}` })
  if (Array.isArray(res.data) && res.data.length >= DB_MAX_ROWS) {
    throw createError({ statusCode: 500, message: `${name} returned ${DB_MAX_ROWS} rows — the page is truncated, not complete` })
  }
  return res
}

// ─── Reads ──────────────────────────────────────────────────────────────

export interface BoardInputs {
  games: Map<number, any>
  lineScores: Map<number, any[]>
  predictions: Map<number, any>
  bets: Map<number, any[]>
  legOf: Map<number, { parlay_id: number; num_legs: number | null; parlay_odds: number | null }>
}

const GAME_COLUMNS =
  'id, date, round, league_key, sport, status, home_goals, away_goals, odds_moneyline:sport_stats->odds, ' +
  'home_team:teams!home_team_id(name, team_key), away_team:teams!away_team_id(name, team_key), ' +
  Object.values(ODDS_COLUMN).join(', ')

/** One `.in()` per table, for any number of fixtures. */
export async function fetchBoardInputs(supabase: SupabaseClient, gameIds: number[]): Promise<BoardInputs> {
  const empty: BoardInputs = { games: new Map(), lineScores: new Map(), predictions: new Map(), bets: new Map(), legOf: new Map() }
  if (!gameIds.length) return empty

  const [gameRes, lsRes, predRes, betsRes] = await Promise.all([
    supabase.from('games').select(GAME_COLUMNS).in('id', gameIds),
    supabase.from('line_scores').select('game_id, market, source, prob, devig').in('game_id', gameIds),
    supabase.from('predictions').select('*').in('game_id', gameIds).order('created_at', { ascending: false }),
    // Every wager on these fixtures, singles and parlay legs alike — the page labels which is
    // which and whose (mirrors are not our money).
    supabase
      .from('bets')
      .select('id, game_id, wallet_id, bet_type, line, odds, stake, status, profit, placed_at, notes, wallets(persona_name, name, archetype)')
      .in('game_id', gameIds)
      .order('placed_at', { ascending: false }),
  ])
  must('games', gameRes); must('line_scores', lsRes); must('predictions', predRes); must('bets', betsRes)

  for (const g of (gameRes.data || []) as any[]) empty.games.set(Number(g.id), g)
  for (const r of (lsRes.data || []) as any[]) {
    const k = Number(r.game_id)
    if (!empty.lineScores.has(k)) empty.lineScores.set(k, [])
    empty.lineScores.get(k)!.push(r)
  }
  // Newest first, so the first row per game is the latest prediction.
  for (const p of (predRes.data || []) as any[]) {
    const k = Number(p.game_id)
    if (!empty.predictions.has(k)) empty.predictions.set(k, p)
  }
  const betRows = (betsRes.data || []) as any[]
  for (const b of betRows) {
    const k = Number(b.game_id)
    if (!empty.bets.has(k)) empty.bets.set(k, [])
    empty.bets.get(k)!.push(b)
  }

  // A bet listed in parlay_legs is a LEG of a slip, not a wager (root CLAUDE.md); ask the
  // table, never infer it from the wallet.
  if (betRows.length) {
    const legRes = must('parlay_legs', await supabase
      .from('parlay_legs')
      .select('bet_id, parlay_id, parlays(num_legs, parlay_odds)')
      .in('bet_id', betRows.map((b) => b.id)))
    for (const l of (legRes.data || []) as any[]) {
      empty.legOf.set(Number(l.bet_id), {
        parlay_id: Number(l.parlay_id),
        num_legs: toNum(l.parlays?.num_legs),
        parlay_odds: toNum(l.parlays?.parlay_odds),
      })
    }
  }
  return empty
}

// ─── Pure builders ──────────────────────────────────────────────────────

/**
 * Collapse `line_scores` to one market probability per market. Preference is accuracy first:
 * the close is the sharpest number, the open is the one that was actually available, our
 * scraped book price is the fallback and the only one present before kick-off.
 */
export function collapseMarketProbs(lineScores: any[]) {
  const marketProb = new Map<string, { prob: number; source: string; devig: string | null }>()
  for (const r of lineScores) {
    const p = toNum(r.prob)
    if (p == null) continue
    const rank = PREFERENCE.indexOf(r.source)
    if (rank < 0) continue
    const held = marketProb.get(r.market)
    if (!held || rank < PREFERENCE.indexOf(held.source)) {
      marketProb.set(r.market, { prob: p, source: r.source, devig: r.devig ?? null })
    }
  }
  return marketProb
}

/** Which cells the picker may bet in a competition, as the coarse label the status line needs. */
export function bettingStatus(sport: string, leagueKey: string) {
  if (sport === 'basketball') {
    const supported = (BASKETBALL_ENABLED_ACTIONS[leagueKey] ?? 0) > 0
    return {
      enabled: supported,
      enabled_markets: supported ? ['home_win'] : [],
      reason: supported
        ? null
        : 'not bet — V5 Thompson only prices NBA/EuroLeague ML_HOME (CD #37); this league is not modelled',
    }
  }
  const enabledMarkets = Object.keys(LEAGUE_ENABLED_MARKETS[leagueKey] || {})
  return {
    enabled: enabledMarkets.length > 0,
    enabled_markets: enabledMarkets,
    reason: enabledMarkets.length > 0 ? null : disabledReason(leagueKey, enabledMarkets[0] || ''),
  }
}

export function isMirrorWager(w: { archetype?: string | null }) {
  return w.archetype === 'external_tipster' || w.archetype === 'user_mirror'
}

export interface FixtureStatus { tag: string; cls: string; text: string }

/**
 * Bet / In slips / Not bet / Scored / No price / Not yet — and why. The ONE status function:
 * the Prediction tab and the league round board both render what this returns.
 */
export function fixtureStatus(args: {
  sport: string
  leagueKey: string
  wagers: { archetype?: string | null; slip: { parlay_id: number } | null }[]
  hasPrediction: boolean
  hasOdds: boolean
  completed: boolean
}): FixtureStatus {
  const ours = args.wagers.filter((w) => !isMirrorWager(w))
  const singles = ours.filter((w) => !w.slip)
  const legs = ours.filter((w) => w.slip)
  if (singles.length) {
    const extra = legs.length ? ` and ${legs.length} parlay leg${legs.length > 1 ? 's' : ''}` : ''
    return { tag: 'Bet', cls: 'gp-status-bet', text: `${singles.length} single${singles.length > 1 ? 's' : ''}${extra} on this fixture in our wallets.` }
  }
  if (legs.length) {
    const slips = new Set(legs.map((w) => w.slip!.parlay_id)).size
    return { tag: 'In slips', cls: 'gp-status-on', text: `${legs.length} leg${legs.length > 1 ? 's' : ''} in ${slips} of our parlay slip${slips > 1 ? 's' : ''} — a leg is not a wager on its own; the slip is.` }
  }
  const betting = bettingStatus(args.sport, args.leagueKey)
  if (!betting.enabled) {
    return { tag: 'Not bet', cls: 'gp-status-off', text: betting.reason || 'This competition has no enabled cell.' }
  }
  if (args.hasPrediction) {
    return { tag: 'Scored', cls: 'gp-status-on', text: 'The model scored this fixture; no wager has been struck on it.' }
  }
  if (!args.hasOdds) {
    return { tag: 'No price', cls: 'gp-status-off', text: 'No odds are stored for this fixture, so there is nothing for the model to price against.' }
  }
  if (args.completed) {
    return { tag: 'Not scored', cls: 'gp-status-off', text: 'This fixture finished with no prediction row — the model never scored it.' }
  }
  return { tag: 'Not yet', cls: 'gp-status-off', text: `No prediction row yet — the ${args.sport} pipeline places at ${PIPELINE_AT[args.sport] || 'its daily run'}.` }
}

/** Is the picker allowed to bet this market here? Football: the mask. Basketball: V5 ML_HOME only. */
function cellEnabled(sport: string, leagueKey: string, market: string): boolean {
  if (sport === 'basketball') return market === 'home_win' && (BASKETBALL_ENABLED_ACTIONS[leagueKey] ?? 0) > 0
  return isEnabled(leagueKey, market)
}

/**
 * A basketball fixture has a moneyline price and no `line_scores` rows, so its result market is
 * the two prices de-vigged proportionally — the only convention available with two outcomes and
 * no closing line. Labelled `book`, the basis of every pre-kick-off price.
 */
function moneylineFromPrices(game: any, marketProb: Map<string, { prob: number; source: string; devig: string | null }>) {
  if (game.sport !== 'basketball' || marketProb.has('home_win')) return
  const h = toNum(game.odds_home) ?? toNum(game.odds_moneyline?.moneyline?.home)
  const a = toNum(game.odds_away) ?? toNum(game.odds_moneyline?.moneyline?.away)
  if (!h || !a || h <= 1 || a <= 1) return
  const ih = 1 / h
  const ia = 1 / a
  marketProb.set('home_win', { prob: ih / (ih + ia), source: 'book', devig: 'proportional' })
  marketProb.set('away_win', { prob: ia / (ih + ia), source: 'book', devig: 'proportional' })
}

export function buildRows(game: any, prediction: any, marketProb: ReturnType<typeof collapseMarketProbs>) {
  const leagueKey: string = game.league_key
  moneylineFromPrices(game, marketProb)
  return MARKETS.map((m) => {
    const mkt = marketProb.get(m.key) || null
    const col = OUR_PROB_COLUMN[m.key]
    // `predictions` stores these as integer percentages.
    const oursPct = col && prediction ? toNum(prediction[col]) : null
    const ours = oursPct == null ? null : oursPct / 100
    const enabled = cellEnabled(game.sport, leagueKey, m.key)

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
}

/** Margin per group, off the prices — which market is cheapest to bet. */
export function buildMargins(game: any): Record<string, number | null> {
  const priceOf = (k: string) => toNum(game[ODDS_COLUMN[k]])
  return {
    '1X2': bookMargin(['home_win', 'draw', 'away_win'].map(priceOf)),
    'Double chance': bookMargin(['dc_1x', 'dc_12', 'dc_x2'].map(priceOf), 2),
    'Over/Under 1.5': bookMargin(['over_15', 'under_15'].map(priceOf)),
    'Over/Under 2.5': bookMargin(['over_25', 'under_25'].map(priceOf)),
    'Over/Under 3.5': bookMargin(['over_35', 'under_35'].map(priceOf)),
    'Both teams to score': bookMargin(['btts', 'btts_no'].map(priceOf)),
  }
}

export function buildImplied(marketProb: ReturnType<typeof collapseMarketProbs>) {
  const marketOf = (k: string) => marketProb.get(k)?.prob ?? null
  return fitImpliedGoals(Object.fromEntries(
    ['home_win', 'draw', 'away_win', 'over_15', 'over_25', 'over_35', 'btts'].map((k) => [k, marketOf(k)]),
  ) as Record<string, number>)
}

export function buildWagers(betRows: any[], legOf: BoardInputs['legOf']) {
  return betRows.map((b) => {
    // Prop bets carry the player and the analyst's reasoning in notes (JSON text).
    let n: any = b.notes
    if (typeof n === 'string') {
      try { n = JSON.parse(n) } catch { n = null }
    }
    return {
      id: b.id,
      wallet_id: b.wallet_id,
      wallet: b.wallets?.persona_name || b.wallets?.name || `W${b.wallet_id}`,
      // external_tipster / user_mirror replay someone else's record — the page must never
      // present those as our wagers.
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
}

/** Football prices stored on `games`, or a basketball moneyline in `sport_stats.odds`. */
export function hasStoredOdds(game: any, rows: any[]): boolean {
  if (rows.length) return true
  const ml = game.odds_moneyline?.moneyline
  return !!(game.odds_home || game.odds_away || ml)
}

/** The full single-fixture board — what `GET /api/game/[id]/market` returns. */
export function buildGameBoard(gameId: number, inputs: BoardInputs) {
  const game: any = inputs.games.get(gameId)
  if (!game) throw createError({ statusCode: 404, message: 'Game not found' })

  const leagueKey: string = game.league_key
  const prediction: any = inputs.predictions.get(gameId) || null
  const marketProb = collapseMarketProbs(inputs.lineScores.get(gameId) || [])
  const marketOf = (k: string) => marketProb.get(k)?.prob ?? null

  const rows = buildRows(game, prediction, marketProb)
  const wagers = buildWagers(inputs.bets.get(gameId) || [], inputs.legOf)

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
      // Raw 1/odds as the picker saw it — NOT de-vigged. The de-vigged market number for the
      // same key is `market_prob`.
      implied_prob: toNum(b.implied_prob),
      market_prob: marketOf(String(b.market)),
      decimal_odds: toNum(b.decimal_odds),
      enabled: isEnabled(leagueKey, String(b.market)),
    }))

  return {
    game_id: gameId,
    league_key: leagueKey,
    status: game.status,
    margins: buildMargins(game),
    implied: buildImplied(marketProb),
    pick: prediction
      ? {
          prediction: prediction.prediction,
          model_version: prediction.model_version,
          // Stored as fractions by every current writer (V6: EV per unit staked, so 1.36 =
          // +136 %). Never guess the unit from magnitude.
          expected_value: toNum(prediction.expected_value),
          kelly_fraction: toNum(prediction.kelly_percentage),
          candidates,
        }
      : null,
    wagers,
    fixture_status: fixtureStatus({
      sport: game.sport,
      leagueKey,
      wagers,
      hasPrediction: !!prediction,
      hasOdds: hasStoredOdds(game, rows),
      completed: game.status === 'completed',
    }),
    // Every price basis that backs a row on this board (distinct, most accurate first). A board
    // can mix them — each market takes its own best source — so there is no single "the
    // basis"; `rows[].marketSource` says which is which.
    bases: summariseBases(rows).bases,
    has_model: !!prediction,
    model_version: prediction?.model_version ?? null,
    enabled_markets: marketProb.size
      ? MARKETS.filter((m) => cellEnabled(game.sport, leagueKey, m.key)).map((m) => m.key)
      : [],
    rows,
  }
}

/**
 * One row of a round board: the same numbers as the fixture's Market tab, for the two markets
 * a row can carry without becoming a second page — the result (1X2) and Over/Under 2.5.
 * Basketball carries its moneyline only, against the V5 mask (ML_HOME).
 */
export function buildRoundRow(gameId: number, inputs: BoardInputs) {
  const board = buildGameBoard(gameId, inputs)
  const game: any = inputs.games.get(gameId)
  const pick = (key: string) => {
    const r = board.rows.find((x) => x.key === key)
    return r
      ? { label: r.label, market: r.market, ours: r.ours, enabled: r.enabled, price: r.price, fairOdds: r.fairOdds, source: r.marketSource, ourLabel: r.ourLabel, disabledNote: r.disabledNote }
      : null
  }
  const wagers = board.wagers
  const mirrors = wagers.filter(isMirrorWager).length

  return {
    game_id: gameId,
    date: game.date,
    status: game.status,
    sport: game.sport,
    home: game.home_team?.name ?? null,
    away: game.away_team?.name ?? null,
    home_key: game.home_team?.team_key ?? null,
    away_key: game.away_team?.team_key ?? null,
    home_goals: game.home_goals,
    away_goals: game.away_goals,
    fixture_status: board.fixture_status,
    result: { home: pick('home_win'), draw: pick('draw'), away: pick('away_win') },
    over_25: { over: pick('over_25'), under: pick('under_25') },
    margin_1x2: board.margins['1X2'],
    margin_ou25: board.margins['Over/Under 2.5'],
    bases: board.bases,
    ours_source: board.has_model ? (board.rows.find((r) => r.ours != null)?.ourLabel ?? 'model') : null,
    wagers: { ours: wagers.length - mirrors, mirrors },
  }
}
