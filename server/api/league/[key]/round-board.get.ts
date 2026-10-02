import { getSupabase } from '~/server/utils/supabase'
import { requireUserId } from '~/server/utils/auth'
import { buildRoundRow, fetchBoardInputs } from '~/server/utils/market-board'
import { enabledCellCount } from '~/server/utils/football-masks'

/**
 * GET /api/league/[key]/round-board?season=2026-2027&round=5   (football, paged by round)
 * GET /api/league/[key]/round-board?season=2025-2026&date=2026-10-02   (basketball, cups: paged by day)
 *
 * One row per fixture of the round, built by the SAME functions as the fixture's own Market
 * tab (`server/utils/market-board.ts`), from one `.in()` per table. The league Predictions tab
 * used to issue a head-to-head request per fixture, matched by team NAME — 50 requests to open
 * a Premier League round — and showed a "goals" figure that was a sum of averages.
 */

/** A cup round or a day of NBA is well under this; past it the page would be truncated, so fail. */
const MAX_FIXTURES = 60

export default defineEventHandler(async (event) => {
  await requireUserId(event)
  const leagueKey = getRouterParam(event, 'key')
  if (!leagueKey) throw createError({ statusCode: 400, message: 'League key required' })

  const q = getQuery(event)
  const season = typeof q.season === 'string' && q.season ? q.season : null
  const round = q.round != null && q.round !== '' ? Number(q.round) : null
  const date = typeof q.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.date) ? q.date : null
  if (round == null && !date) throw createError({ statusCode: 400, message: 'A round or a date is required' })
  if (round != null && !Number.isInteger(round)) throw createError({ statusCode: 400, message: 'round must be an integer' })

  const supabase = getSupabase()

  let query = supabase.from('games').select('id, sport').eq('league_key', leagueKey)
  if (season) query = query.eq('season', season)
  if (round != null) {
    query = query.eq('round', round)
  } else if (date) {
    const next = new Date(Date.parse(`${date}T00:00:00Z`) + 86400_000).toISOString().slice(0, 10)
    query = query.gte('date', `${date}T00:00:00Z`).lt('date', `${next}T00:00:00Z`)
  }
  const idsRes = await query.order('date', { ascending: true }).limit(MAX_FIXTURES + 1)
  if (idsRes.error) throw createError({ statusCode: 500, message: `games query failed: ${idsRes.error.message}` })
  const ids = (idsRes.data || []) as { id: number; sport: string }[]
  if (ids.length > MAX_FIXTURES) {
    throw createError({ statusCode: 500, message: `more than ${MAX_FIXTURES} fixtures in one page — refusing to return a truncated board` })
  }

  const inputs = await fetchBoardInputs(supabase, ids.map((g) => Number(g.id)))
  const rows = ids
    .map((g) => buildRoundRow(Number(g.id), inputs))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))

  const sport = ids[0]?.sport ?? 'football'
  return {
    league_key: leagueKey,
    season,
    round,
    date,
    sport,
    enabled_cells: enabledCellCount(leagueKey, sport),
    rows,
  }
})
