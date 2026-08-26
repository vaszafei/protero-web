import { getSupabase } from '~/server/utils/supabase'
import { getCached, setCache } from '~/server/utils/cache'
import { currentSeason } from '~/utils/season'

/**
 * GET /api/leagues/overview — every competition, with its twin and its role.
 *
 * The leagues page used to be a wall of logos with a game count. That answers
 * "does this league have data" and nothing else. An operator needs three things
 * per competition:
 *
 *   1. What it IS — tier, cup or league, how much corpus it has.
 *   2. What the twin makes of it — `level` (fitted strength, comparable ACROSS
 *      competitions, which is the entire point of the entity layer), home
 *      advantage, spread.
 *   3. What we DO with it — bet, predict-only, or data collection.
 *
 * (3) is derived from the `bets` ledger rather than from a copy of
 * `ml/v6/masks.py`. A hand-maintained mirror of a live registry is the defect
 * that left `utils/wallet-meta.ts` stopping at wallet 20 while the pipelines
 * wrote to W26–W36. The ledger cannot go stale: a league we bet has bets.
 *
 * The competition list is the UNION of the `leagues` registry, `twin_league`
 * and the distinct league keys in `games` — not the registry alone. On
 * 2026-08-22 the registry held 22 rows while `games` carried 15 more keys,
 * including all six domestic cups ingested on 2026-08-20 and
 * `conference_league`: 5,000+ fixtures the leagues page could not show because
 * nothing had inserted a registry row for them.
 */

/** A league with no settled or pending bet in this window is not "bet". */
const BET_WINDOW_DAYS = 400

export default defineEventHandler(async (event) => {
  const supabase = getSupabase()
  const query = getQuery(event)
  const season = (query.season as string) || currentSeason()

  const cacheKey = `leagues:overview:${season}`
  const cached = getCached<any>(cacheKey)
  if (cached) return cached

  const since = new Date(Date.now() - BET_WINDOW_DAYS * 86400_000).toISOString()

  const [leaguesRes, twinRes, betsRes, corpusRes, activeClubsRes] = await Promise.all([
    supabase.from('leagues').select('key, name, flag, country, sport, season'),

    supabase
      .from('twin_league')
      .select('league_key, sport, tier, is_cup, n_games, n_teams, avg_goals, level, home_adv, spread, state_as_of'),

    // What we actually wager on, and where. Aggregated in the DATABASE
    // (`league_bet_counts` RPC): counting `bets` rows client-side is silently
    // truncated by PostgREST's db-max-rows, which reported leagues we had bet
    // as DATA-only (2,738 bets in the window collapsed to "1,000 seen").
    supabase.rpc('league_bet_counts', { p_since: since }),

    // Corpus size per competition. Aggregated in the DATABASE (`league_corpus`
    // view): counting `games` rows client-side is silently truncated by
    // PostgREST's db-max-rows, which reported copa_del_rey as 0 of its 359
    // games. Also the source of the competitions with no registry row.
    supabase
      .from('league_corpus')
      .select('league_key, sport, n_games, n_played, n_upcoming, n_seasons, first_game, last_game, next_fixture'),

    // Clubs in THIS season, as opposed to twin_league.n_teams which pools
    // every club the twin has ever rated across every season — La Liga 2 read
    // 58 there while this year's table has 22.
    supabase
      .from('league_active_clubs')
      .select('league_key, season, n_active_clubs'),
  ])

  for (const r of [leaguesRes, twinRes, betsRes, corpusRes, activeClubsRes]) {
    if (r.error) throw createError({ statusCode: 500, message: r.error.message })
  }

  const twinByKey = new Map((twinRes.data || []).map((t: any) => [t.league_key, t]))

  const betCounts: Record<string, { n: number; pending: number }> = {}
  for (const row of (betsRes.data || [])) {
    const key = (row as any).league_key
    if (!key) continue
    betCounts[key] = {
      n: Number((row as any).n ?? 0),
      pending: Number((row as any).pending ?? 0),
    }
  }

  // Union the three sources, registry first so its names and flags win.
  const registryByKey = new Map((leaguesRes.data || []).map((l: any) => [l.key, l]))

  const corpus = new Map<string, any>((corpusRes.data || []).map((c: any) => [c.league_key, c]))
  const activeClubs = new Map<string, any>((activeClubsRes.data || []).map((a: any) => [a.league_key, a]))

  const allKeys = new Set<string>([
    ...registryByKey.keys(),
    ...twinByKey.keys(),
    ...corpus.keys(),
  ])

  const leagues = [...allKeys].map((key: string) => {
    const l = registryByKey.get(key) || {
      key,
      name: prettify(key),
      flag: null,
      country: null,
      sport: corpus.get(key)?.sport || twinByKey.get(key)?.sport || 'football',
      season: null,
    }
    const twin = twinByKey.get(l.key) || null
    const c = corpus.get(l.key) || null
    const b = betCounts[l.key] || { n: 0, pending: 0 }
    return {
      key: l.key,
      name: l.name,
      sport: l.sport,
      country: l.country,
      flag: l.flag,
      tier: twin?.tier ?? null,
      is_cup: twin?.is_cup ?? false,
      // Twin ratings. `level` is null for competitions outside the European
      // corpus the layer is fitted on (argentina_primera, brazil_serie_a) —
      // render that as "not fitted", never as zero.
      level: twin?.level ?? null,
      home_adv: twin?.home_adv ?? null,
      spread: twin?.spread ?? null,
      avg_goals: twin?.avg_goals ?? null,
      twin_games: twin?.n_games ?? 0,
      twin_teams: twin?.n_teams ?? 0,
      // This season's clubs, distinct from twin_teams above (pooled all-time).
      active_clubs: activeClubs.get(l.key)?.n_active_clubs ?? null,
      state_as_of: twin?.state_as_of ?? null,
      in_registry: registryByKey.has(l.key),
      // Whole-corpus counts, not this season's — a competition's identity is
      // what we hold for it, and several are between seasons on any given day.
      games: Number(c?.n_games ?? 0),
      played: Number(c?.n_played ?? 0),
      upcoming: Number(c?.n_upcoming ?? 0),
      seasons: Number(c?.n_seasons ?? 0),
      first_game: c?.first_game ?? null,
      last_game: c?.last_game ?? null,
      next_fixture: c?.next_fixture ?? null,
      bets: b.n,
      bets_pending: b.pending,
      role: b.n > 0 ? 'bet' : (Number(c?.n_games ?? 0) > 0 ? 'data' : 'idle'),
    }
  })

  const result = { leagues, season, generated_at: new Date().toISOString() }
  setCache(cacheKey, result, 180)
  return result
})

/** `copa_del_rey` → `Copa Del Rey`, for keys the registry never named. */
function prettify(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
