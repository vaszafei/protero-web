import { getSupabase } from '~/server/utils/supabase'
import { enabledCells } from '~/server/utils/football-masks'

/**
 * GET /api/dashboard — the operator control room readout.
 *
 * One endpoint rather than six client queries, because every panel here is a
 * different shape of the same question: "is the machine healthy, and what is
 * it exposed to right now".
 *
 * Rules this endpoint inherits and must not break:
 *
 *   - A WAGER is one settled single, or one parlay at its parlay price. Never
 *     a parlay's legs. All wallet numbers therefore come from the
 *     `get_wallet_performance` RPC, which already encodes that rule — this
 *     file must never recompute ROI, and must never derive it from
 *     (balance - initial_balance), which is bankroll return.
 *   - Open exposure is the stake sitting on unsettled wagers. Parlay legs are
 *     excluded from the singles sum for the same reason: the money at risk is
 *     the parlay's `total_stake`, counted once.
 *   - MIRRORED WALLETS ARE NOT OURS. W33-W47 replay an external tipster's
 *     published picks at a flat 1.00 (`ml/tipsters/project_bets.py`,
 *     2026-08-23); W54 replays a real bettor's ACTUAL Stoiximan slips at their
 *     real stakes (`lifecycle='user_mirror'`). Both are `bets` rows that settle
 *     through the same engine, but nobody on our side staked that money.
 *     Counting them as exposure, as slate, or in the week's P&L makes this
 *     readout describe a bankroll that does not exist — so every "ours" figure
 *     here filters on `archetype <> 'external_tipster' AND lifecycle <>
 *     'user_mirror'`, and the mirrors are surfaced separately.
 *   - The regression gates (scripts/gates.sh) persist only a summary row in
 *     `gate_runs` via common.gate_recorder (roadmap A4), so they are NOT
 *     reported here. /gates renders them from that table.
 *   - `wallet_scorecards` is a SECOND basis and is forwarded as `risk`, never
 *     as performance. Its writer (`common/wallet_scorecard.py`) selects
 *     `bets WHERE status IN ('won','lost')` with no `parlay_legs` exclusion, so
 *     on a wallet that parlays it counts legs as wagers. Today that is only the
 *     mirrors (33-36, 48-51), which this fleet already drops — so every fleet
 *     row's scorecard rests on the same wagers as the RPC, and W26 reads 64/13.79%
 *     on both. Re-check that if a fleet wallet ever starts writing parlays; ROI
 *     and the verdict must keep coming from the RPC either way.
 */

/** A pipeline that has not written a run in this many hours is stale. */
const PIPELINE_STALE_HOURS = 36

/** `wallet_scorecards.window_days` sentinel for "every settled wager". */
const LIFETIME_WINDOW = -1

export default defineEventHandler(async () => {
  const supabase = getSupabase()

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400_000).toISOString()
  const sevenDaysAhead = new Date(now.getTime() + 7 * 86400_000).toISOString()

  const [
    perfRes,
    walletsRes,
    openSinglesRes,
    openParlaysRes,
    settledRes,
    runsRes,
    riskRes,
    scorecardRes,
    calibrationRes,
    currencyRes,
  ] = await Promise.all([
    // Fleet performance — the RPC is the only sanctioned source of these numbers.
    supabase.rpc('get_wallet_performance'),

    supabase
      .from('wallets')
      .select('id, name, persona_name, bio, archetype, lifecycle, is_active')
      .order('id', { ascending: true }),

    // Open singles, with the fixture they are riding on. Parlay legs excluded:
    // a leg is not a wager and its stake is not separately at risk.
    supabase
      .from('bets')
      .select(`
        id, wallet_id, game_id, bet_type, stake, odds, line, expected_value,
        placed_at, sport, strategy, notes,
        game:games!game_id(
          id, date, status, league_key,
          home_team:teams!home_team_id(id, name),
          away_team:teams!away_team_id(id, name)
        )
      `)
      .eq('status', 'pending')
      .order('placed_at', { ascending: false })
      .limit(200),

    supabase
      .from('parlays')
      .select('id, wallet_id, total_stake, parlay_odds, status, created_at')
      .eq('status', 'pending')
      .limit(200),

    // Settled in the last 7 days — singles only here; parlays are added below.
    supabase
      .from('bets')
      .select('id, wallet_id, stake, odds, profit, status, settled_at')
      .in('status', ['won', 'lost'])
      .gte('settled_at', sevenDaysAgo)
      .limit(2000),

    supabase
      .from('pipeline_runs')
      .select('pipeline, status, errors, warnings, started_at, finished_at')
      .order('started_at', { ascending: false })
      .limit(50),

    // Carried ratings: fixtures in the next 7 days where a club plays outside the division
    // its twin rating was learned in. A warning about the twin's carry, never a price —
    // every club here IS rated, and DC scores these fixtures better than unflagged ones.
    supabase
      .from('twin_fixture_risk')
      .select('game_id, date, league_key, home_team, away_team, blind_side, home_evidence_league, away_evidence_league')
      .gte('date', now.toISOString())
      .lte('date', sevenDaysAhead)
      .order('date', { ascending: true })
      .limit(200),

    // Risk-adjusted read of the same settled wagers, from `common.wallet_scorecard`.
    // Newest-first and de-duped per wallet below: the writer stamps every wallet
    // in one batch, so the newest rows cover the whole roster.
    supabase
      .from('wallet_scorecards')
      .select('wallet_id, computed_at, n_bets, sharpe, max_drawdown_pct, pct_green_days, verdict')
      .eq('window_days', LIFETIME_WINDOW)
      .order('computed_at', { ascending: false })
      .limit(200),

    // Model vs the closing line, paired per fixture, for the 13 cells the mask
    // actually bets. The cells are passed in rather than known to the database
    // — `masks.py` is the source of truth and `football-masks.ts` its one
    // sanctioned mirror.
    supabase.rpc('line_scores_model_vs_close', { p_cells: enabledCells() }),

    supabase.rpc('line_scores_currency'),
  ])

  for (const r of [perfRes, walletsRes, openSinglesRes, openParlaysRes, settledRes, runsRes, riskRes, scorecardRes, calibrationRes, currencyRes]) {
    if (r.error) throw createError({ statusCode: 500, message: r.error.message })
  }

  const performance = perfRes.data || []
  const wallets = walletsRes.data || []
  const openSingles = openSinglesRes.data || []
  const openParlays = openParlaysRes.data || []
  const settled = settledRes.data || []
  const risk = riskRes.data || []

  // ── Parlay legs must not be counted as open singles ──────────────────
  // `parlay_legs` is the authority on what a leg is; `notes.parlay_id` is a
  // convention some writers use and some don't, so ask the table.
  const openSingleIds = openSingles.map((b: any) => b.id)
  let legBetIds = new Set<number>()
  if (openSingleIds.length) {
    const { data: legs, error: legErr } = await supabase
      .from('parlay_legs')
      .select('bet_id')
      .in('bet_id', openSingleIds)
    if (legErr) throw createError({ statusCode: 500, message: legErr.message })
    legBetIds = new Set((legs || []).map((l: any) => l.bet_id))
  }
  const openSingleWagers = openSingles.filter((b: any) => !legBetIds.has(b.id))

  const walletById = new Map(wallets.map((w: any) => [w.id, w]))
  const perfById = new Map(performance.map((p: any) => [p.wallet_id, p]))

  // ── Risk scorecards, newest per wallet ───────────────────────────────
  // Only the three columns that carry per-wallet information are forwarded.
  // `clv_avg` is NULL for every wallet (odds_snapshots is too sparse to pair),
  // `calmar` is |roi| / max_dd and so degenerates to |roi| wherever max_dd hits
  // its 1.0 cap, and `brier_ema` / `gamma_value` / `regime_flag` come from
  // `_regime_info`, which ignores its wallet_id argument and reads one global
  // `gamma_state` row — the same number stamped on all 24 wallets, football and
  // basketball alike. Rendering any of those per wallet would invent a
  // distinction the table does not hold.
  const scorecardByWallet = new Map<number, any>()
  for (const sc of (scorecardRes.data || [])) {
    if (!scorecardByWallet.has(sc.wallet_id)) scorecardByWallet.set(sc.wallet_id, sc)
  }

  /**
   * True for a wallet whose money is not ours: a mirrored external tipster
   * (W33-W47, flat 1.00 replay) or a user-mirror (W54, a real bettor's real
   * Stoiximan stakes). Real `bets` rows, same engine, but nobody on our side
   * staked them — so they stay out of exposure / slate / weekly P&L / fleet.
   */
  const isMirror = (walletId: number) => {
    const w = walletById.get(walletId)
    return w?.archetype === 'external_tipster' || w?.lifecycle === 'user_mirror'
  }

  const ourOpenSingles = openSingleWagers.filter((b: any) => !isMirror(b.wallet_id))
  const ourOpenParlays = openParlays.filter((p: any) => !isMirror(p.wallet_id))

  // ── Open exposure — OUR money only ───────────────────────────────────
  const exposure = {
    n_singles: ourOpenSingles.length,
    n_parlays: ourOpenParlays.length,
    stake_singles: round2(sum(ourOpenSingles.map((b: any) => Number(b.stake) || 0))),
    stake_parlays: round2(sum(ourOpenParlays.map((p: any) => Number(p.total_stake) || 0))),
    get n_wagers() { return this.n_singles + this.n_parlays },
    get stake() { return round2(this.stake_singles + this.stake_parlays) },
  }

  // ── Live slate: open singles on fixtures that have not kicked off ─────
  const liveSlate = ourOpenSingles
    .filter((b: any) => b.game?.date && new Date(b.game.date) >= new Date(now.getTime() - 3 * 3600_000))
    .sort((a: any, b: any) => new Date(a.game.date).getTime() - new Date(b.game.date).getTime())
    .slice(0, 25)
    .map((b: any) => ({
      id: b.id,
      wallet_id: b.wallet_id,
      wallet_name: walletById.get(b.wallet_id)?.persona_name || walletById.get(b.wallet_id)?.name || `W${b.wallet_id}`,
      game_id: b.game_id,
      date: b.game.date,
      league_key: b.game.league_key,
      home: b.game.home_team?.name ?? null,
      away: b.game.away_team?.name ?? null,
      bet_type: b.bet_type,
      line: b.line,
      stake: Number(b.stake),
      odds: Number(b.odds),
      expected_value: b.expected_value == null ? null : Number(b.expected_value),
      sport: b.sport,
      notes: b.notes,
    }))

  // ── Last 7 days, settled ─────────────────────────────────────────────
  // Singles that were legs of a parlay are excluded, then parlays are added
  // once each at their own price. Same wager rule as the RPC.
  const settledIds = settled.map((b: any) => b.id)
  let settledLegIds = new Set<number>()
  if (settledIds.length) {
    const { data: legs, error: legErr } = await supabase
      .from('parlay_legs')
      .select('bet_id')
      .in('bet_id', settledIds)
    if (legErr) throw createError({ statusCode: 500, message: legErr.message })
    settledLegIds = new Set((legs || []).map((l: any) => l.bet_id))
  }
  const settledSingles = settled
    .filter((b: any) => !settledLegIds.has(b.id))
    .filter((b: any) => !isMirror(b.wallet_id))

  const { data: settledParlays, error: spErr } = await supabase
    .from('parlays')
    .select('id, wallet_id, total_stake, parlay_odds, status, settled_at')
    .in('status', ['won', 'lost'])
    .gte('settled_at', sevenDaysAgo)
    .limit(500)
  if (spErr) throw createError({ statusCode: 500, message: spErr.message })

  const recentWagers = [
    ...settledSingles.map((b: any) => ({
      stake: Number(b.stake) || 0,
      won: b.status === 'won',
      pnl: b.profit == null
        ? (b.status === 'won' ? Number(b.stake) * (Number(b.odds) - 1) : -Number(b.stake))
        : Number(b.profit),
    })),
    ...(settledParlays || []).filter((p: any) => !isMirror(p.wallet_id)).map((p: any) => ({
      stake: Number(p.total_stake) || 0,
      won: p.status === 'won',
      pnl: p.status === 'won'
        ? Number(p.total_stake) * (Number(p.parlay_odds) - 1)
        : -Number(p.total_stake),
    })),
  ]

  const week = {
    n_wagers: recentWagers.length,
    n_won: recentWagers.filter(w => w.won).length,
    turnover: round2(sum(recentWagers.map(w => w.stake))),
    pnl: round2(sum(recentWagers.map(w => w.pnl))),
  }

  // ── Pipelines ────────────────────────────────────────────────────────
  const latestRun = new Map<string, any>()
  for (const r of (runsRes.data || [])) {
    if (!latestRun.has(r.pipeline)) latestRun.set(r.pipeline, r)
  }
  const pipelines = [...latestRun.values()].map((r: any) => {
    const started = r.started_at ? new Date(r.started_at) : null
    const ageHours = started ? (now.getTime() - started.getTime()) / 3600_000 : null
    return {
      pipeline: r.pipeline,
      status: r.status,
      errors: r.errors ?? 0,
      warnings: r.warnings ?? 0,
      started_at: r.started_at,
      age_hours: ageHours == null ? null : Math.round(ageHours * 10) / 10,
      stale: ageHours == null ? true : ageHours > PIPELINE_STALE_HOURS,
    }
  })

  // ── Fleet: wallets that have written something, or are meant to ──────
  // Mirrors are excluded: 15 external-tipster mirrors + W54 (user mirror)
  // would swamp a seven-wallet control room with rows an operator cannot act
  // on. They live on /wallet, where the coverage that qualifies their numbers
  // is rendered beside them.
  const fleet = wallets
    .filter((w: any) => w.archetype !== 'external_tipster' && w.lifecycle !== 'user_mirror')
    .map((w: any) => ({
      id: w.id,
      name: w.persona_name || w.name,
      archetype: w.archetype,
      lifecycle: w.lifecycle,
      is_active: w.is_active,
      perf: perfById.get(w.id) || null,
      risk: riskOf(scorecardByWallet.get(w.id)),
    }))
    .filter((w: any) => w.lifecycle === 'trader' || (w.perf && Number(w.perf.n_wagers) > 0))

  // ── Calibration: are we anywhere near the close on the cells we bet? ──
  // Sorted by skill against the close, best first. Every one of them is
  // currently negative, which is the standing finding (0 of 98 cells beat the
  // close) rendered on the cells that carry money rather than asserted.
  const calibration = {
    cells: (calibrationRes.data || [])
      .map((c: any) => ({
        league_key: c.league_key,
        market: c.market,
        source: c.source,
        n: Number(c.n),
        first_date: c.first_date,
        last_date: c.last_date,
        brier_ours: c.brier_ours == null ? null : Number(c.brier_ours),
        brier_close: c.brier_close == null ? null : Number(c.brier_close),
        bss: c.bss == null ? null : Number(c.bss),
      }))
      .sort((a: any, b: any) => (b.bss ?? -Infinity) - (a.bss ?? -Infinity)),
    // Cells the mask enables that the spine has never scored — they render as
    // "no rows", never as a zero.
    missing: enabledCells()
      .filter((c) => !(calibrationRes.data || []).some(
        (r: any) => r.league_key === c.league_key && r.market === c.market))
      .map((c) => `${c.league_key}/${c.market}`),
    currency: (currencyRes.data || []).map((r: any) => ({
      source: r.source,
      n_graded: Number(r.n_graded),
      last_date: r.last_date,
      unscored_completed: Number(r.unscored_completed),
    })),
  }

  return {
    generated_at: now.toISOString(),
    calibration,
    exposure: {
      n_wagers: exposure.n_wagers,
      n_singles: exposure.n_singles,
      n_parlays: exposure.n_parlays,
      stake: exposure.stake,
    },
    live_slate: liveSlate,
    week,
    fleet,
    pipelines,
    blind_spots: {
      total: risk.length,
      rows: risk.slice(0, 8),
    },
  }
})

/**
 * One wallet's risk read, or null.
 *
 * `sharpe` / `max_drawdown_pct` / `pct_green_days` are only written at n>=10,
 * so a young wallet returns nulls beside a real `n_bets` — which is the honest
 * shape, not an omission.
 */
function riskOf(sc: any) {
  if (!sc) return null
  return {
    computed_at: sc.computed_at,
    n_bets: Number(sc.n_bets ?? 0),
    sharpe: sc.sharpe == null ? null : Number(sc.sharpe),
    max_drawdown_pct: sc.max_drawdown_pct == null ? null : Number(sc.max_drawdown_pct),
    pct_green_days: sc.pct_green_days == null ? null : Number(sc.pct_green_days),
    verdict: sc.verdict || null,
  }
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
