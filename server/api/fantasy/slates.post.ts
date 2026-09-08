/**
 * POST /api/fantasy/slates
 *
 * Slate intake for the Stoiximan DFS operator console (§F.1). Accepts a raw
 * Stoiximan player CSV as text, parses it server-side, runs the D3 join
 * against `fantasy_player_map`, and writes `fantasy_slates` +
 * `fantasy_slate_players`. Returns the join result inline: matched count and
 * the list of unmatched `expected`/`possible` players — a silent hole in the
 * lineup is a visible defect before the optimiser runs.
 *
 * Body:
 *   {
 *     csv: string            // raw CSV text (utf-8, BOM tolerated)
 *     tournament: string     // 'Greek Super League' | 'Champions League' | …
 *     contest?: { name, field_size, prize_pool, salary_cap, salary_cap_unit,
 *                 lineup_size, formation }
 *   }
 */
import { requireUserId } from '~/server/utils/auth'
import { getSupabase } from '~/server/utils/supabase'

const POSITION_GROUP: Record<string, string> = {
  goalkeeper: 'GK', defender: 'DEF', midfielder: 'MID', forward: 'FWD',
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

  // Collect source player ids, then fetch the D3 map in one query.
  const dataRows = rows.slice(1).filter(r => r.length >= 7)
  const sourceIds = dataRows.map(r => r[iPlayerID]).filter(Boolean)

  const { data: mapRows, error: mapErr } = await supabase
    .from('fantasy_player_map')
    .select('source_player_id, player_id, confidence')
    .in('source_player_id', sourceIds)
  if (mapErr) throw createError({ statusCode: 500, statusMessage: mapErr.message })

  const map = new Map<string, { player_id: string; confidence: number }>()
  for (const m of mapRows ?? []) map.set(m.source_player_id, { player_id: m.player_id, confidence: m.confidence })

  // Build player rows
  const playerRows = dataRows.map(r => {
    const posRaw = (r[iPosition] || '').trim().toLowerCase()
    const mapped = map.get(r[iPlayerID])
    return {
      slate_id: slate.id,
      source_player_id: r[iPlayerID],
      name: r[iName],
      fname: r[iFName] || null,
      club_code: r[iClub],
      lineup_status: r[iLineup],
      position: POSITION_GROUP[posRaw] || posRaw,
      price: parseFloat(r[iPrice]) || 0,
      mapped_player_id: mapped?.player_id || null,
      map_confidence: mapped?.confidence ?? null,
    }
  })

  const { error: playersErr } = await supabase.from('fantasy_slate_players').insert(playerRows)
  if (playersErr) throw createError({ statusCode: 500, statusMessage: playersErr.message })

  // Join result for the inline display (§F.1)
  const unmatchedExpected = playerRows.filter(
    p => p.mapped_player_id === null && (p.lineup_status === 'expected' || p.lineup_status === 'possible'),
  )
  const matched = playerRows.filter(p => p.mapped_player_id !== null).length

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
