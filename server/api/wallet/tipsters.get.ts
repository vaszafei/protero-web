import { getSupabase } from '~/server/utils/supabase'

/**
 * GET /api/wallet/tipsters — provenance and coverage for the mirrored wallets.
 *
 * WHAT CHANGED ON 2026-08-23, AND WHY IT MATTERS
 * ----------------------------------------------
 * This endpoint used to compute a SECOND record for each tipster: a flat-unit
 * ROI graded by the source's own published green/red. It existed because
 * W33-W36 read n=0 — their picks had never been projected into `bets`.
 *
 * They have been now (`ml/tipsters/project_bets.py`, flat 1.00 per slip,
 * settled by `common.settlement.settle` like every other wager), so the wallet
 * page carries a real ledger figure for each of them. Leaving the old
 * self-graded ROI in place would put **two different records for the same
 * wallet on the same page** — the two-implementations defect this repo has
 * paid for in settlement twice. So the ROI is gone from here. The ledger is
 * the record; this endpoint answers the question the ledger cannot:
 *
 *   1. **How much of the source is in it.** 12-17% of published slips bind to
 *      a fixture in our corpus, so a tipster wallet's ROI describes its
 *      *bindable* picks. Coverage runs 0%-37% per author. Render it beside the
 *      ROI or the reader will take the ROI for the tipster's record.
 *   2. **Whether our verdict matches theirs.** freetips247 publishes a per-leg
 *      green/red; betarades publishes none at all. Where both exist this is a
 *      free integrity check on our own settlement, and it caught something:
 *      before the market whitelist landed, 2 of 31 disagreed — both because a
 *      bare "Over 6.5" under a `Σύνολο Καρτών` (total CARDS) label had been
 *      graded against goals.
 *   3. **What the residue is.** `no_fixture` is our resolver's limit, not the
 *      source's, and it is the single biggest lever on these wallets' n.
 *
 * A source that is registered but never scraped must still appear, AS THAT.
 */
export default defineEventHandler(async () => {
  const supabase = getSupabase()

  const [sourcesRes, coverageRes, userMirrorRes, walletsRes] = await Promise.all([
    supabase.from('tipster_sources').select('key, name, base_url, notes, robots_ok_at'),
    supabase.from('v_tipster_wallet_coverage').select('*'),
    // The user-mirror wallet (W54) lives in a separate view — its source data is
    // user_real_bets + stoiximan_leg_binding, not the tipster tables. Same column
    // shape, so it merges into `authors` unchanged; it is NOT a tipster source and
    // gets no `sources` entry.
    supabase.from('v_user_mirror_wallet_coverage').select('*'),
    supabase.from('wallets').select('id, name, persona_name, bio, archetype, lifecycle'),
  ])

  for (const r of [sourcesRes, coverageRes, userMirrorRes, walletsRes]) {
    if (r.error) throw createError({ statusCode: 500, message: r.error.message })
  }

  const walletById = new Map((walletsRes.data || []).map((w: any) => [w.id, w]))

  const authors = [...(coverageRes.data || []), ...(userMirrorRes.data || [])].map((c: any) => {
    const w = walletById.get(c.wallet_id)
    return {
      wallet_id: c.wallet_id,
      wallet_name: (w?.persona_name || w?.name) ?? null,
      source_key: c.source_key,
      author: c.author,
      slips: Number(c.slips),
      slips_in_ledger: Number(c.slips_in_ledger),
      coverage_pct: c.coverage_pct == null ? 0 : Number(c.coverage_pct),
      legs: Number(c.legs),
      legs_resolved: Number(c.legs_resolved),
      legs_no_fixture: Number(c.legs_no_fixture),
      legs_no_market: Number(c.legs_no_market),
      // Null, not zero: betarades publishes no verdict, and "0 comparable" is
      // a different statement from "0 agreed".
      verdict_comparable: Number(c.verdict_comparable) || null,
      verdict_agree: Number(c.verdict_comparable) ? Number(c.verdict_agree) : null,
      first: c.first_seen,
      last: c.last_seen,
    }
  }).sort((a: any, b: any) => b.slips - a.slips)

  const bySource = new Map<string, any[]>()
  for (const a of authors) {
    const list = bySource.get(a.source_key) || []
    list.push(a)
    bySource.set(a.source_key, list)
  }

  const sources = (sourcesRes.data || []).map((s: any) => {
    const rows = bySource.get(s.key) || []
    const slips = rows.reduce((n, r) => n + r.slips, 0)
    const inLedger = rows.reduce((n, r) => n + r.slips_in_ledger, 0)
    return {
      key: s.key,
      name: s.name,
      base_url: s.base_url,
      notes: s.notes,
      robots_cleared: s.robots_ok_at != null,
      authors: rows,
      slips,
      slips_in_ledger: inLedger,
      coverage_pct: slips ? Math.round((inLedger / slips) * 1000) / 10 : 0,
      // Three distinct states, and the difference is operational:
      //   backfilled — slips ingested, wallets provisioned
      //   built      — adapter exists and robots.txt is cleared, no backfill
      //   no_adapter — registered as known, nothing may scrape it yet
      state: rows.length ? 'backfilled' : (s.robots_ok_at != null ? 'built' : 'no_adapter'),
    }
  }).sort((a: any, b: any) => b.slips - a.slips)

  return {
    /** The owner's stake convention (2026-08-23); each wallet's `bio` says it too. */
    unit_stake: 1,
    sources,
    authors,
  }
})
