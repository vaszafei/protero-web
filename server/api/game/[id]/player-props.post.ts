import { getSupabase } from '~/server/utils/supabase'

interface PropInput {
  player_name: string
  team_name: string
  market: string
  line: number
  over_odds?: number | null
  under_odds?: number | null
}

// New format from OCR pipeline
interface ParsedPropsInput {
  players: Record<string, {
    team: string
    points?: { line: number; over: number; under: number }
    rebounds?: { line: number; over: number; under: number }
    assists?: { line: number; over: number; under: number }
    pra?: { line: number; over: number; under: number }
  }>
  alt_lines: Record<string, Record<string, { team: string; lines: Record<string, number> }>>
}

interface PlayerLog {
  pts: number
  reb: number
  ast: number
  min: number
  date: string
  opp: string
  team: string
  game_id: number
  pra: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Strip Greek characters, OCR artifacts, and trailing punctuation from a name */
function cleanOcrName(raw: string): string {
  if (!raw) return ''
  return raw
    .replace(/[{}<>|]/g, '')                           // OCR bracket artifacts
    .replace(/[\u0370-\u03FF\u1F00-\u1FFF]+/g, '')    // Greek Unicode ranges
    .replace(/[^\w\s.\-']/g, '')                       // Keep only word chars, spaces, dots, hyphens, apostrophes
    .replace(/\s+/g, ' ')                              // Collapse whitespace
    .replace(/^[\s.\-]+|[\s.\-]+$/g, '')               // Trim leading/trailing dots, hyphens, spaces
    .trim()
}

/** Normalise "LAST, First" or "FIRST LAST" to "First Last" */
function normaliseName(raw: string): string {
  if (!raw) return ''
  const s = cleanOcrName(raw)
  if (!s) return ''
  if (s.includes(',')) {
    const [last, first] = s.split(',', 2)
    return `${first.trim()} ${last.trim()}`
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
  }
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

/** Extract last name from a "First Last" or "First Middle Last" name */
function lastName(name: string): string {
  const parts = name.split(' ').filter(Boolean)
  return parts.length > 0 ? parts[parts.length - 1].toLowerCase() : ''
}

/** Simple Levenshtein distance for short strings */
function levenshtein(a: string, b: string): number {
  const la = a.length, lb = b.length
  if (la === 0) return lb
  if (lb === 0) return la
  const dp: number[][] = Array.from({ length: la + 1 }, (_, i) =>
    Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[la][lb]
}

/**
 * Find the best matching player name from known DB names.
 * Designed for OCR-garbled names matched against a small game roster (~25 names).
 * Strategy chain: exact → CI → last-name → first-name-fuzzy+last-exact → substring → Levenshtein
 */
function fuzzyMatchPlayer(ocrName: string, knownNames: string[]): string | null {
  if (!ocrName || !knownNames.length) return null
  const normalized = normaliseName(ocrName)
  if (!normalized) return null
  const lower = normalized.toLowerCase()

  // 1. Exact match
  if (knownNames.includes(normalized)) return normalized

  // 2. Case-insensitive exact match
  const ciMatch = knownNames.find(k => k.toLowerCase() === lower)
  if (ciMatch) return ciMatch

  // 3. Last-name exact match (unique last name within roster)
  const ocrLast = lastName(normalized)
  if (ocrLast.length >= 3) {
    const lastNameMatches = knownNames.filter(k => lastName(k) === ocrLast)
    if (lastNameMatches.length === 1) return lastNameMatches[0]
  }

  // 4. First-name-fuzzy + last-name-exact match
  //    OCR often drops or garbles the first name: "Ike" for "Mike", "lion" for "Elijah"
  //    If last name matches exactly, accept with any first name distance
  if (ocrLast.length >= 3) {
    const lastNameMatches = knownNames.filter(k => lastName(k) === ocrLast)
    if (lastNameMatches.length === 1) return lastNameMatches[0]
    // Also try: OCR last name is a suffix of the real last name or vice versa
    const suffixMatches = knownNames.filter(k => {
      const kLast = lastName(k)
      return kLast.length >= 4 && (kLast.endsWith(ocrLast) || ocrLast.endsWith(kLast))
    })
    if (suffixMatches.length === 1) return suffixMatches[0]
  }

  // 5. Substring match — OCR drops first letter(s): "ike James" → "Mike James"
  //    Or keeps only part: "zh Bry" → look for last name starting with remaining
  const ocrParts = lower.split(' ').filter(Boolean)
  if (ocrParts.length >= 1) {
    // Try matching the longest OCR token as a substring of any known name
    const longestToken = ocrParts.reduce((a, b) => a.length >= b.length ? a : b)
    if (longestToken.length >= 4) {
      const subMatches = knownNames.filter(k => k.toLowerCase().includes(longestToken))
      if (subMatches.length === 1) return subMatches[0]
    }
    // Try: OCR last token matches start of a known last name (e.g. "Bry" → "Bryant")
    const ocrLastToken = ocrParts[ocrParts.length - 1]
    if (ocrLastToken.length >= 3) {
      const prefixMatches = knownNames.filter(k => lastName(k).startsWith(ocrLastToken))
      if (prefixMatches.length === 1) return prefixMatches[0]
    }
  }

  // 6. Levenshtein fuzzy match on last name only (more tolerant than full name)
  if (ocrLast.length >= 3) {
    let bestMatch: string | null = null
    let bestDist = Infinity
    for (const known of knownNames) {
      const kLast = lastName(known)
      const d = levenshtein(ocrLast, kLast)
      if (d < bestDist && d <= 2) {
        bestDist = d
        bestMatch = known
      }
    }
    if (bestMatch) return bestMatch
  }

  // 7. Full-name Levenshtein as last resort
  const maxDist = Math.min(3, Math.ceil(normalized.length * 0.3))
  let bestMatch: string | null = null
  let bestDist = Infinity
  for (const known of knownNames) {
    const d = levenshtein(lower, known.toLowerCase())
    if (d < bestDist && d <= maxDist) {
      bestDist = d
      bestMatch = known
    }
  }
  return bestMatch
}

function statKey(market: string): string {
  return { points: 'pts', rebounds: 'reb', assists: 'ast', pra: 'pra', '3pm': '3pm' }[market] || 'pts'
}

function hitRate(logs: PlayerLog[], market: string, line: number, n = 20) {
  const key = statKey(market) as keyof PlayerLog
  const recent = logs.slice(0, n)
  if (recent.length < 5) return null
  const values = recent.map(g => Number(g[key] || 0))
  const hits = values.filter(v => v > line).length
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const sd = Math.sqrt(values.reduce((a, v) => a + Math.pow(v - avg, 2), 0) / values.length)
  const sorted = [...values].sort((a, b) => a - b)
  const p25 = sorted[Math.floor(sorted.length * 0.25)]
  return {
    hit_pct: Math.round((hits / recent.length) * 100),
    hits,
    games: recent.length,
    avg: Math.round(avg * 10) / 10,
    sd: Math.round(sd * 10) / 10,
    p25,
    min: sorted[0],
    values: values.slice(0, 10),
  }
}

function last10(logs: PlayerLog[], market: string, line: number) {
  const key = statKey(market) as keyof PlayerLog
  const recent = logs.slice(0, 10)
  if (!recent.length) return null
  const values = recent.map(g => Number(g[key] || 0))
  const hits = values.filter(v => v > line).length
  return {
    hit_pct: Math.round((hits / recent.length) * 100),
    hits,
    total: recent.length,
    values,
  }
}

function h2h(logs: PlayerLog[], opponent: string, market: string, line: number) {
  const key = statKey(market) as keyof PlayerLog
  const h2hLogs = logs.filter(g => g.opp?.toLowerCase().includes(opponent.toLowerCase().slice(0, 6)))
  if (!h2hLogs.length) return null
  const values = h2hLogs.map(g => Number(g[key] || 0))
  const hits = values.filter(v => v > line).length
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  return {
    hit_pct: Math.round((hits / values.length) * 100),
    hits,
    games: values.length,
    avg: Math.round(avg * 10) / 10,
    values,
  }
}

function vsTop(logs: PlayerLog[], leagueKey: string, market: string) {
  // We can't easily know who's "top" without standings, but we approximate:
  // games where opponent scored well = harder games. Use top half by opponent total.
  // Fallback: just return null if we can't compute
  return null
}

function consistency(logs: PlayerLog[]) {
  if (logs.length < 5) return null
  const recent = logs.slice(0, 20)
  const pra = recent.map(g => g.pts + g.reb + g.ast)
  const avg = pra.reduce((a, b) => a + b, 0) / pra.length
  if (avg === 0) return null
  const sd = Math.sqrt(pra.reduce((a, v) => a + Math.pow(v - avg, 2), 0) / pra.length)
  return {
    pra_avg: Math.round(avg * 10) / 10,
    pra_sd: Math.round(sd * 10) / 10,
    pra_cv: Math.round((sd / avg) * 100) / 100,
  }
}

function scorePick(
  seasonHr: ReturnType<typeof hitRate>,
  l10Hr: ReturnType<typeof last10>,
  h2hHr: ReturnType<typeof h2h>,
  cv: ReturnType<typeof consistency>
): { tier: number; score: number; green_flags: string[]; red_flags: string[]; confidence: number } {
  let score = 0
  const green_flags: string[] = []
  const red_flags: string[] = []

  if (seasonHr) {
    if (seasonHr.hit_pct >= 75) { score += 2; green_flags.push(`Season ${seasonHr.hit_pct}%`) }
    else if (seasonHr.hit_pct >= 65) { score += 1; green_flags.push(`Season ${seasonHr.hit_pct}%`) }
    else if (seasonHr.hit_pct < 50) red_flags.push(`Season only ${seasonHr.hit_pct}%`)
  } else {
    red_flags.push('No season data')
  }

  if (l10Hr) {
    if (l10Hr.hit_pct >= 80) { score += 2; green_flags.push(`L10: ${l10Hr.hits}/${l10Hr.total}`) }
    else if (l10Hr.hit_pct >= 70) { score += 1; green_flags.push(`L10: ${l10Hr.hits}/${l10Hr.total}`) }
    else if (l10Hr.hit_pct < 50) red_flags.push(`L10: only ${l10Hr.hits}/${l10Hr.total}`)
  }

  if (h2hHr && h2hHr.games >= 2) {
    if (h2hHr.hit_pct >= 75) { score += 3; green_flags.push(`H2H: ${h2hHr.hits}/${h2hHr.games} (avg ${h2hHr.avg})`) }
    else if (h2hHr.hit_pct >= 50) { score += 1; green_flags.push(`H2H: ${h2hHr.hits}/${h2hHr.games}`) }
    else { score -= 1; red_flags.push(`H2H: only ${h2hHr.hits}/${h2hHr.games} (avg ${h2hHr.avg})`) }
  } else if (h2hHr && h2hHr.games === 1) {
    green_flags.push(`H2H (1g): ${h2hHr.values[0]}`)
  } else {
    red_flags.push('No H2H data')
  }

  if (cv) {
    if (cv.pra_cv < 0.25) { score += 1; green_flags.push(`CV=${cv.pra_cv} (Elite)`) }
    else if (cv.pra_cv < 0.35) green_flags.push(`CV=${cv.pra_cv} (Solid)`)
    else red_flags.push(`CV=${cv.pra_cv} (Volatile)`)
  }

  let tier: number
  if (score >= 7 && red_flags.length === 0) tier = 1
  else if (score >= 4 && red_flags.length <= 1) tier = 2
  else tier = 3

  const confidence = Math.min(95, Math.max(30, score * 10 + (red_flags.length === 0 ? 10 : 0)))

  return { tier, score, green_flags, red_flags, confidence }
}

// ─── Alt-line analysis ────────────────────────────────────────────────────────

/** Find the best alt line for a player+market from the alt_lines grid. */
function analyzeBestAltLine(
  logs: PlayerLog[],
  market: string,
  altLineMap: Record<string, number>  // threshold (e.g. "13") → odds
): { line: number; odds: number; season_hr: number; l10_hr: number; score: number } | null {
  const entries = Object.entries(altLineMap)
    .map(([thresh, odds]) => {
      // "13" means "13+" → strictly > 12.5
      const line = parseInt(thresh) - 0.5
      const sHr = hitRate(logs, market, line)
      const l10Hr = last10(logs, market, line)
      const season_hr = sHr?.hit_pct ?? 0
      const l10_hr = l10Hr?.hit_pct ?? 0
      // Combined score: weight HR more than odds
      const score = season_hr * 0.4 + l10_hr * 0.4 + Math.min(Math.log(odds || 1) * 10, 20)
      return { line: parseInt(thresh), odds, season_hr, l10_hr, score }
    })
    .filter(e => e.season_hr >= 50 || e.l10_hr >= 50)

  if (!entries.length) return null
  // Sort by score desc, then by lower line (safer)
  entries.sort((a, b) => b.score - a.score || a.line - b.line)
  return entries[0] || null
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const gameId = parseInt(getRouterParam(event, 'id') || '0')
  if (!gameId) throw createError({ statusCode: 400, message: 'Game ID required' })

  const body = await readBody(event)
  const {
    league_key,
    game_date,
    home_team,
    away_team,
    player_props: legacyProps,
    parsed_props,
  } = body as {
    league_key: string
    game_date: string
    home_team: string
    away_team: string
    player_props?: PropInput[]
    parsed_props?: ParsedPropsInput
  }

  // Build a flat PropInput list from either format
  let player_props: PropInput[] = []

  if (parsed_props && (Object.keys(parsed_props.players).length > 0 || Object.keys(parsed_props.alt_lines).length > 0)) {
    // New OCR format — extract from players (O/U lines)
    for (const [name, pdata] of Object.entries(parsed_props.players)) {
      const team = pdata.team || ''
      for (const market of ['points', 'rebounds', 'assists', 'pra'] as const) {
        const md = pdata[market]
        if (!md?.line) continue
        // Reject garbled OCR lines (e.g. 249.5 for a player's points line)
        const maxReasonable = market === 'points' ? 60 : market === 'pra' ? 80 : 30
        if (md.line > maxReasonable) continue
        player_props.push({
          player_name: name,
          team_name: team,
          market,
          line: md.line,
          over_odds: md.over,
          under_odds: md.under,
        })
      }
    }
    // Also pull any players who appear ONLY in alt_lines (no O/U line found by OCR)
    for (const [market, marketPlayers] of Object.entries(parsed_props.alt_lines)) {
      for (const [name, entry] of Object.entries(marketPlayers)) {
        const alreadyHasOU = player_props.some(p => p.player_name === name && p.market === market)
        if (!alreadyHasOU && Object.keys(entry.lines).length > 0) {
          // Filter out garbled OCR thresholds (basketball points max ~60, rebounds ~25, assists ~20)
          const maxReasonable = market === 'points' ? 60 : market === 'pra' ? 80 : 30
          const validThresholds = Object.keys(entry.lines).map(Number).filter(t => t > 0 && t <= maxReasonable).sort((a, b) => a - b)
          if (validThresholds.length === 0) continue
          const medianThresh = validThresholds[Math.floor(validThresholds.length / 2)]
          player_props.push({
            player_name: name,
            team_name: entry.team || '',
            market,
            line: medianThresh - 0.5,
            over_odds: entry.lines[String(medianThresh)] ?? null,
            under_odds: null,
          })
        }
      }
    }
  } else if (legacyProps?.length) {
    player_props = legacyProps
  }

  // Pre-filter: remove props with completely garbled names (no Latin chars at all)
  player_props = player_props.filter(p => {
    const cleaned = cleanOcrName(p.player_name)
    return cleaned.length >= 2 && /[a-zA-Z]/.test(cleaned)
  })

  if (!player_props.length) throw createError({ statusCode: 400, message: 'No valid player props found — all names were garbled or too short' })

  const supabase = getSupabase()

  // ── Load historical game logs (both seasons) ──────────────────────────────
  const { data: gamesRaw, error: gErr } = await supabase
    .from('games')
    .select('id, date, sport_stats, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)')
    .eq('league_key', league_key)
    .in('season', ['2025-2026', '2024-2025', '2023-2024'])
    .eq('status', 'completed')
    .not('sport_stats', 'is', null)
    .order('date', { ascending: false })
    .limit(2000)

  if (gErr) throw createError({ statusCode: 500, message: gErr.message })

  // Build per-player logs from sport_stats JSONB
  const playerLogs: Record<string, PlayerLog[]> = {}

  for (const game of (gamesRaw || [])) {
    const ss = game.sport_stats as any
    if (!ss) continue
    const homeTeamName = (game.home_team as any)?.name || ''
    const awayTeamName = (game.away_team as any)?.name || ''

    for (const [side, teamName, oppName] of [
      ['home', homeTeamName, awayTeamName],
      ['away', awayTeamName, homeTeamName],
    ] as const) {
      const players = ss[side]?.players
      if (!Array.isArray(players)) continue

      for (const p of players) {
        const raw = p.name || ''
        const name = normaliseName(raw)
        if (!name) continue

        const minsRaw = p.minutes || p.min || '0'
        let mins = 0
        if (typeof minsRaw === 'string' && minsRaw.includes(':')) {
          mins = parseInt(minsRaw.split(':')[0])
        } else {
          mins = parseInt(String(minsRaw)) || 0
        }
        if (mins < 8) continue

        const entry: PlayerLog = {
          pts: parseInt(p.pts || '0') || 0,
          reb: parseInt(p.reb || p.rebounds || '0') || 0,
          ast: parseInt(p.ast || p.assists || '0') || 0,
          min: mins,
          date: String(game.date).slice(0, 10),
          opp: oppName,
          team: teamName,
          game_id: game.id,
          pra: 0,
        }
        entry.pra = entry.pts + entry.reb + entry.ast

        if (!playerLogs[name]) playerLogs[name] = []
        playerLogs[name].push(entry)
      }
    }
  }

  // ── Save props to player_props table ────────────────────────────────────────
  const targetDate = game_date.slice(0, 10)
  const opponent = (prop: PropInput) =>
    [home_team, away_team].find(t => t?.toLowerCase() !== prop.team_name?.toLowerCase()) || ''

  await supabase.from('player_props').upsert(
    player_props.map(p => ({
      game_id: gameId,
      player_name: p.player_name,
      team_name: p.team_name,
      market: p.market,
      line: p.line,
      over_odds: p.over_odds,
      under_odds: p.under_odds,
      league_key,
      sport: 'basketball',
      target_date: targetDate,
      source: 'manual',
    })),
    { onConflict: 'game_id,player_name,market,line', ignoreDuplicates: false }
  )

  // ── Build game roster: players from THIS game's two teams ────────────────
  // This is the key: match OCR names against only the ~25 players who could
  // actually be playing, not the entire league's history.
  const gameRoster: Set<string> = new Set()
  const homeTeamLower = (home_team || '').toLowerCase()
  const awayTeamLower = (away_team || '').toLowerCase()
  for (const [name, logs] of Object.entries(playerLogs)) {
    if (!logs.length) continue
    const teamLower = (logs[0].team || '').toLowerCase()
    if (teamLower && (teamLower.includes(homeTeamLower.slice(0, 6)) || homeTeamLower.includes(teamLower.slice(0, 6)) ||
        teamLower.includes(awayTeamLower.slice(0, 6)) || awayTeamLower.includes(teamLower.slice(0, 6)))) {
      gameRoster.add(name)
    }
  }
  // Use game roster for matching (small pool = much better fuzzy accuracy).
  // Fall back to all known names only if roster is too small (data gap).
  const rosterNames = gameRoster.size >= 8 ? Array.from(gameRoster) : Object.keys(playerLogs)

  // ── Run 7-layer analysis for each prop ────────────────────────────────────
  const picks: any[] = []

  for (const prop of player_props) {
    const name = normaliseName(prop.player_name)
    // Try exact match first, then fuzzy match against game roster
    const matchedName = playerLogs[name] ? name : fuzzyMatchPlayer(prop.player_name, rosterNames)
    const logs = matchedName ? (playerLogs[matchedName] || []) : []
    const opp = opponent(prop)

    const sHr = hitRate(logs, prop.market, prop.line)
    const l10Hr = last10(logs, prop.market, prop.line)
    const h2hHr = h2h(logs, opp, prop.market, prop.line)
    const cv = consistency(logs)
    const { tier, score, green_flags, red_flags, confidence } = scorePick(sHr, l10Hr, h2hHr, cv)

    // Find best alt line if available from parsed_props
    let best_alt_line: ReturnType<typeof analyzeBestAltLine> = null
    if (parsed_props?.alt_lines?.[prop.market]) {
      const altEntry = Object.entries(parsed_props.alt_lines[prop.market]).find(
        ([n]) => n === prop.player_name || normaliseName(n) === normaliseName(prop.player_name)
      )
      if (altEntry) {
        best_alt_line = analyzeBestAltLine(logs, prop.market, altEntry[1].lines)
      }
    }

    // Resolve the team name from the matched player's logs (not from OCR garbage)
    const resolvedTeam = matchedName && playerLogs[matchedName]?.[0]?.team
      ? playerLogs[matchedName][0].team
      : prop.team_name

    const pick: any = {
      game_id: gameId,
      player_name: matchedName || cleanOcrName(prop.player_name) || prop.player_name,
      player_name_ocr: prop.player_name,
      team_name: resolvedTeam,
      opponent: opp,
      market: prop.market,
      line: prop.line,
      odds: prop.over_odds,
      league_key,
      sport: 'basketball',
      target_date: targetDate,
      pick_type: tier === 1 ? 'tier1' : tier === 2 ? 'tier2' : 'tier3',
      direction: 'OVER',
      trad_tier: tier,
      trad_score: score,
      confidence,
      // Season stats
      season_hr: sHr?.hit_pct ?? null,
      season_games: sHr?.games ?? null,
      season_avg: sHr?.avg ?? null,
      season_sd: sHr?.sd ?? null,
      // L10
      l10_hr: l10Hr?.hit_pct ?? null,
      l10_hits: l10Hr?.hits ?? null,
      l10_values: l10Hr?.values ?? null,
      // H2H
      h2h_hr: h2hHr?.hit_pct ?? null,
      h2h_n: h2hHr?.games ?? null,
      h2h_avg: h2hHr?.avg ?? null,
      h2h_values: h2hHr?.values ?? null,
      // CV
      cv: cv?.pra_cv ?? null,
      // Flags
      green_flags,
      red_flags,
      // Best alt line recommendation
      best_alt_line,
      model_version: 'props_v1',
    }

    picks.push(pick)
  }

  // ── Delete old picks for this game, then insert fresh ────────────────────
  await supabase.from('player_prop_picks').delete().eq('game_id', gameId)

  const pickRows = picks.map(p => ({
    game_id: p.game_id,
    player_name: p.player_name,
    team_name: p.team_name,
    opponent: p.opponent,
    market: p.market,
    line: p.line,
    odds: p.odds,
    league_key: p.league_key,
    sport: p.sport,
    target_date: p.target_date,
    pick_type: p.pick_type,
    direction: p.direction,
    trad_tier: p.trad_tier,
    trad_score: p.trad_score,
    season_hr: p.season_hr,
    l10_hr: p.l10_hr,
    h2h_hr: p.h2h_hr,
    h2h_n: p.h2h_n,
    cv: p.cv,
    confidence: p.confidence,
    sniper_signals: p.green_flags,
    model_version: 'props_v1',
  }))

  if (pickRows.length > 0) {
    await supabase.from('player_prop_picks').insert(pickRows)
  }

  // Return enriched response with matching metadata
  const matched = picks.filter(p => p.player_name !== p.player_name_ocr && p.season_hr !== null).length
  const unmatched = picks.filter(p => p.season_hr === null).length

  return {
    picks,
    meta: {
      total_parsed: player_props.length,
      total_picks: picks.length,
      matched_with_data: matched,
      no_data: unmatched,
      roster_size: gameRoster.size,
    },
  }
})
