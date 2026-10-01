/**
 * POST /api/fantasy/slates
 *
 * Slate intake for the Stoiximan DFS operator console (§F.1), shared by football and
 * basketball leagues — same CSV shape (Tournament,PlayerID,Name,FName,Club,Lineup,Position,Price),
 * same `fantasy_slates`/`fantasy_slate_players` tables, so both sports show up in one history list.
 *
 * Football leagues additionally run the D3 join against `fantasy_player_map` (mapped_player_id +
 * confidence) — basketball has no such table; `fantasy.dfs_slate`'s own name/club matching runs
 * later, at generate time, so basketball rows are written with mapped_player_id=null and the
 * detail page must not read that as "unmatched" the way it does for football.
 *
 * Positions are normalised at write time so the stored value always matches what each sport's
 * optimiser expects (PG/SG/SF/PF/C for basketball's 5-class scheme, GK/DEF/MID/FWD for football) —
 * `fantasy.dfs_slate.parse_slate_csv` does the same normalisation when reading a CSV directly, and
 * skipping it here silently breaks the optimiser's position-slot matching (0 feasible lineups,
 * with no error — caught 2026-09-25 testing a real EuroLeague slate).
 *
 * Body:
 *   {
 *     csv: string            // raw CSV text (utf-8, BOM tolerated)
 *     tournament: string     // 'Greek Super League' | 'Champions League' | 'EuroLeague' | 'NBA' | …
 *     league_key?: string
 *     contest?: { name, field_size, prize_pool, salary_cap, salary_cap_unit,
 *                 lineup_size, formation }
 *   }
 */
import { requireUserId } from '~/server/utils/auth'
import { getSupabase } from '~/server/utils/supabase'
import { fantasyClubTeamId } from '~/utils/fantasyClubs'

const BASKETBALL_LEAGUES = new Set(['euroleague', 'nba'])

const POSITION_GROUP: Record<string, string> = {
  goalkeeper: 'GK', defender: 'DEF', midfielder: 'MID', forward: 'FWD',
}
// Mirrors fantasy.salary_matcher.STOIXIMAN_POS_MAP (protero-ml/ml-basketball) — the CSV's
// five-class scheme collapsed to the PG/SG/SF/PF/C the optimiser's roster slots expect.
const BASKETBALL_POSITION_GROUP: Record<string, string> = {
  guard_point: 'PG', guard_shooting: 'SG',
  forward_small: 'SF', forward_power: 'PF',
  center: 'C',
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c === '\r') { /* skip */ }
    else field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const body = await readBody<{
    csv: string
    tournament: string
    league_key?: string
    contest?: Record<string, any>
  }>(event)

  if (!body?.csv || !body.tournament) {
    throw createError({ statusCode: 400, statusMessage: 'Missing csv or tournament' })
  }

  const text = body.csv.replace(/^\uFEFF/, '')
  const rows = parseCSV(text)
  if (rows.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'CSV has no data rows' })
  }
  const header = rows[0]
  const idx = (name: string) => header.findIndex(h => h.trim().toLowerCase() === name.toLowerCase())
  const iTournament = idx('Tournament')
  const iPlayerID = idx('PlayerID')
  const iName = idx('Name')
  const iFName = idx('FName')
  const iClub = idx('Club')
  const iLineup = idx('Lineup')
  const iPosition = idx('Position')
  const iPrice = idx('Price')
  if ([iPlayerID, iName, iClub, iLineup, iPosition, iPrice].some(i => i < 0)) {
    throw createError({ statusCode: 400, statusMessage: 'CSV header missing required columns' })
  }

  const supabase = getSupabase()

  // Write the slate
  const c = body.contest || {}
  const { data: slate, error: slateErr } = await supabase
    .from('fantasy_slates')
    .insert({
      tournament: body.tournament,
      league_key: body.league_key || null,
      source_player_csv: null,
      contest_name: c.name || null,
      field_size: c.field_size || null,
      prize_pool: c.prize_pool || null,
      salary_cap: c.salary_cap || null,
      salary_cap_unit: c.salary_cap_unit || null,
      lineup_size: c.lineup_size || null,
      formation: c.formation || null,
    })
    .select('id')
    .single()
  if (slateErr || !slate) throw createError({ statusCode: 500, statusMessage: slateErr?.message || 'slate insert failed' })

  const isBasketball = BASKETBALL_LEAGUES.has(body.league_key || '')
  const dataRows = rows.slice(1).filter(r => r.length >= 7)

  // The D3 join (fantasy_player_map) is football-only — basketball has no such table.
  // fantasy.dfs_slate's own name/club matching runs later, at generate time.
  const map = new Map<string, { player_id: string; confidence: number }>()
  if (!isBasketball) {
    const sourceIds = dataRows.map(r => r[iPlayerID]).filter(Boolean)
    const { data: mapRows, error: mapErr } = await supabase
      .from('fantasy_player_map')
      .select('source_player_id, player_id, confidence')
      .in('source_player_id', sourceIds)
    if (mapErr) throw createError({ statusCode: 500, statusMessage: mapErr.message })
    for (const m of mapRows ?? []) map.set(m.source_player_id, { player_id: m.player_id, confidence: m.confidence })
  }

  // Build player rows
  const playerRows = dataRows.map(r => {
    const posRaw = (r[iPosition] || '').trim().toLowerCase()
    const position = isBasketball
      ? (BASKETBALL_POSITION_GROUP[posRaw] || posRaw.toUpperCase())
      : (POSITION_GROUP[posRaw] || posRaw)
    const mapped = map.get(r[iPlayerID])
    return {
      slate_id: slate.id,
      source_player_id: r[iPlayerID],
      name: r[iName],
      fname: r[iFName] || null,
      club_code: r[iClub],
      lineup_status: r[iLineup],
      position,
      price: parseFloat(r[iPrice]) || 0,
      mapped_player_id: mapped?.player_id || null,
      map_confidence: mapped?.confidence ?? null,
      club_team_id: isBasketball ? null : fantasyClubTeamId(r[iClub]),
    }
  })

  const { error: playersErr } = await supabase.from('fantasy_slate_players').insert(playerRows)
  if (playersErr) throw createError({ statusCode: 500, statusMessage: playersErr.message })

  // Join result for the inline display (§F.1) — basketball has no D3 map to report on;
  // its own name/club matching happens at generate time instead.
  const unmatchedExpected = isBasketball ? [] : playerRows.filter(
    p => p.mapped_player_id === null && (p.lineup_status === 'expected' || p.lineup_status === 'possible'),
  )
  const matched = isBasketball ? playerRows.length : playerRows.filter(p => p.mapped_player_id !== null).length

  return {
    slate_id: slate.id,
    total_players: playerRows.length,
    matched,
    unmatched_total: playerRows.length - matched,
    unmatched_expected_possible: unmatchedExpected.map(p => ({
      name: p.name, fname: p.fname, club: p.club_code, lineup: p.lineup_status,
    })),
  }
})
