import { getSupabase } from '~/server/utils/supabase'

/**
 * GET /api/wallet/tipsters — the external tipster sources and their record.
 *
 * WHY THIS IS NOT A LEDGER, AND MUST NEVER BECOME ONE
 * ---------------------------------------------------
 * The tipster wallets (W33–W36) read n=0 on the wallet page because their
 * picks were never projected into `bets`. That was deliberate: only 15 of 344
 * ingested slips resolve fully against our own corpus (74.5% of legs have no
 * fixture in `games`), so a real ledger would be n=4/5/6/0 per wallet.
 *
 * What this endpoint returns instead is a UNIT record at a flat 1 unit per
 * slip, graded by **the source's own published verdict** (`site_result`:
 * green/red/orange), which covers 921 of 953 legs. Three consequences, all of
 * which the UI must carry:
 *
 *   1. It is the tipster's claim about itself, not our settlement. Our
 *      settlement engine (`common/settlement.py`) is the only thing allowed to
 *      decide won/lost in this project, and it cannot grade these — the
 *      fixtures are not in our corpus. So this is never written to `bets`,
 *      never touches `wallets.balance`, and is never comparable to a wallet
 *      ROI produced by `get_wallet_performance`.
 *   2. The source chooses what to publish and how to mark it. A site selling
 *      picks is not a neutral scorer of its own picks.
 *   3. The returns are outlier-driven. `top_share` reports what fraction of a
 *      source's positive units came from its single best slip — for Boulis
 *      that is a 150.00 single plus a 137.65 nine-leg parlay carrying ~95% of
 *      a headline +547%. An ROI like that is a concentration artifact, not a
 *      track record.
 *
 * `coverage` is the honest counterweight: how much of the source we can check
 * ourselves.
 */

/** The stake convention recorded in each tipster wallet's bio: flat, per slip. */
const UNIT_STAKE = 1

export default defineEventHandler(async () => {
  const supabase = getSupabase()

  const [sourcesRes, walletsRes, tipWalletsRes, slipsRes, picksRes] = await Promise.all([
    supabase.from('tipster_sources').select('key, name, base_url, notes, robots_ok_at'),
    supabase.from('wallets').select('id, name, persona_name, bio, archetype, lifecycle'),
    supabase.from('tipster_wallets').select('wallet_id, source_key, author'),
    supabase
      .from('tipster_slips')
      .select('id, source_key, author, wallet_id, combined_odds, num_legs, published_at, title, url')
      .limit(5000),
    supabase
      .from('tipster_picks')
      .select('slip_id, site_result, resolution_status, game_id')
      .limit(20000),
  ])

  for (const r of [sourcesRes, walletsRes, tipWalletsRes, slipsRes, picksRes]) {
    if (r.error) throw createError({ statusCode: 500, message: r.error.message })
  }

  const slips = slipsRes.data || []
  const picks = picksRes.data || []

  // Roll legs up to their slip.
  const bySlip = new Map<number, { green: number; red: number; orange: number; blank: number; legs: number; resolved: number }>()
  for (const p of picks) {
    const s = bySlip.get(p.slip_id) || { green: 0, red: 0, orange: 0, blank: 0, legs: 0, resolved: 0 }
    s.legs++
    if (p.site_result === 'green') s.green++
    else if (p.site_result === 'red') s.red++
    else if (p.site_result === 'orange') s.orange++
    else s.blank++
    if (p.resolution_status === 'resolved' && p.game_id) s.resolved++
    bySlip.set(p.slip_id, s)
  }

  type Acc = {
    source_key: string
    author: string
    wallet_id: number | null
    slips: number
    legs: number
    /** Slips we could fully resolve against OUR corpus — what we can check. */
    slips_resolvable: number
    legs_resolvable: number
    graded: number
    won: number
    units: number
    odds_sum: number
    best: { units: number; odds: number; legs: number; title: string | null; url: string | null } | null
    first: string | null
    last: string | null
  }

  const acc = new Map<string, Acc>()

  for (const s of slips) {
    const key = `${s.source_key}::${s.author ?? '—'}`
    const a = acc.get(key) || {
      source_key: s.source_key,
      author: s.author ?? '—',
      wallet_id: s.wallet_id ?? null,
      slips: 0, legs: 0, slips_resolvable: 0, legs_resolvable: 0,
      graded: 0, won: 0, units: 0, odds_sum: 0, best: null,
      first: null, last: null,
    }

    const roll = bySlip.get(s.id)
    a.slips++
    a.legs += roll?.legs ?? (Number(s.num_legs) || 0)
    a.legs_resolvable += roll?.resolved ?? 0
    if (roll && roll.legs > 0 && roll.resolved === roll.legs) a.slips_resolvable++

    if (s.published_at) {
      if (!a.first || s.published_at < a.first) a.first = s.published_at
      if (!a.last || s.published_at > a.last) a.last = s.published_at
    }

    // Grade the slip by the SOURCE's own leg verdicts. A slip is only gradeable
    // when every leg carries one — an orange (push/void) or an unmarked leg
    // makes the slip's outcome unknown, and guessing it is how a settler
    // invents money.
    const odds = Number(s.combined_odds)
    if (roll && odds > 1) {
      const verdict = roll.red > 0
        ? 'lost'
        : (roll.orange === 0 && roll.blank === 0 && roll.green === roll.legs ? 'won' : null)

      if (verdict) {
        a.graded++
        a.odds_sum += odds
        const u = verdict === 'won' ? UNIT_STAKE * (odds - 1) : -UNIT_STAKE
        a.units += u
        if (verdict === 'won') {
          a.won++
          if (!a.best || u > a.best.units) {
            a.best = { units: u, odds, legs: roll.legs, title: s.title ?? null, url: s.url ?? null }
          }
        }
      }
    }

    acc.set(key, a)
  }

  const walletById = new Map((walletsRes.data || []).map((w: any) => [w.id, w]))
  const tipWalletByPair = new Map(
    (tipWalletsRes.data || []).map((t: any) => [`${t.source_key}::${t.author}`, t.wallet_id]))

  const authors = [...acc.values()].map(a => {
    const walletId = a.wallet_id ?? tipWalletByPair.get(`${a.source_key}::${a.author}`) ?? null
    const w = walletId ? walletById.get(walletId) : null
    const wname = (w?.persona_name || w?.name) ?? null
    return {
      source_key: a.source_key,
      author: a.author,
      wallet_id: walletId,
      wallet_name: wname,
      slips: a.slips,
      legs: a.legs,
      slips_resolvable: a.slips_resolvable,
      legs_resolvable: a.legs_resolvable,
      coverage_pct: a.legs ? Math.round((a.legs_resolvable / a.legs) * 1000) / 10 : 0,
      graded: a.graded,
      won: a.won,
      units: Math.round(a.units * 100) / 100,
      roi_pct: a.graded ? Math.round((a.units / (a.graded * UNIT_STAKE)) * 1000) / 10 : null,
      avg_odds: a.graded ? Math.round((a.odds_sum / a.graded) * 100) / 100 : null,
      best: a.best,
      top_share: topShare(a.best?.units ?? 0, a.units),
      first: a.first,
      last: a.last,
    }
  }).sort((x, y) => y.slips - x.slips)

  // Sources, including the ones with no slips at all — a source that is
  // registered but never backfilled must be visible AS THAT, not absent.
  const bySource = new Map<string, any[]>()
  for (const a of authors) {
    const list = bySource.get(a.source_key) || []
    list.push(a)
    bySource.set(a.source_key, list)
  }

  const sources = (sourcesRes.data || []).map((s: any) => {
    const rows = bySource.get(s.key) || []
    return {
      key: s.key,
      name: s.name,
      base_url: s.base_url,
      notes: s.notes,
      robots_cleared: s.robots_ok_at != null,
      authors: rows,
      slips: rows.reduce((n, r) => n + r.slips, 0),
      // Three distinct states, and the difference matters operationally:
      //   backfilled — slips ingested, wallets provisioned
      //   built      — adapter exists and robots.txt is cleared, backfill not run
      //   no_adapter — registered as known, nothing may scrape it yet
      state: rows.length ? 'backfilled' : (s.robots_ok_at != null ? 'built' : 'no_adapter'),
    }
  }).sort((a: any, b: any) => b.slips - a.slips)

  return {
    unit_stake: UNIT_STAKE,
    sources,
    authors,
  }
})

/** What fraction of the net units came from the single best slip. */
function topShare(bestUnits: number, netUnits: number): number | null {
  if (!bestUnits || netUnits <= 0) return null
  return Math.round(Math.min(1, bestUnits / netUnits) * 1000) / 10
}
