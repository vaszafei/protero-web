/**
 * Resolve a hand-typed "Home - Away" string (Greek or Latin, Stoiximan
 * spelling or ours) to candidate `games` rows around a date.
 *
 * Feeds `GET /api/fixtures/search`, which the Add-bet modal calls per leg so
 * the operator can bind a hand-entered slip leg to a fixture (Option A of
 * `docs/plans/bill-wallet-manual-bet-entry.md`). It returns CANDIDATES; the
 * operator picks one. Nothing here binds a leg on a name alone — the
 * duplicate-team-row history (root CLAUDE.md) is why.
 *
 * Name resolution reuses the binder's own alias corpus
 * (`protero-tools/data/stoiximan-*-aliases.json`, the source of truth for
 * `ml.tipsters.bind_stoiximan`) so a spelling the Playwright chain would
 * resolve resolves here too, then falls back to `teams.name` / `team_key`.
 * The two corpora stay separate on purpose: ΑΕΚ is a different entity per
 * sport.
 */
import { readFileSync } from 'node:fs'
import { getCached, setCache } from './cache'
import { getSupabase } from './supabase'

const REPO = '/home/zafnitlab/Desktop/Projects/protero'
const CORPUS: Record<string, string> = {
  football: `${REPO}/protero-tools/data/stoiximan-greek-aliases.json`,
  basketball: `${REPO}/protero-tools/data/stoiximan-bask-aliases.json`,
}

/** Same windows as bind_stoiximan.py: ±3 days, ±10 for calendar-year LATAM leagues. */
const WINDOW_DAYS = 3
const WINDOW_LATAM = 10
const LATAM_KEYS = new Set(['argentina_primera', 'brazil_serie_a', 'colombia_primera_a', 'mexico_liga_mx', 'usa_mls'])

export interface FixtureCandidate {
  game_id: number
  date: string
  league_key: string
  home: string
  away: string
  status: string
  /** How each side was matched — shown to the operator, never acted on. */
  matched: 'both' | 'one'
}

interface TeamRow { id: number; name: string; team_key: string | null; league_key: string | null }

/** Lowercase, strip diacritics/tonos, keep letters+digits, collapse spaces. */
export function normaliseName(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function loadAliases(sport: string): Map<string, number> {
  const key = `fixture-search:aliases:${sport}`
  const hit = getCached<Map<string, number>>(key)
  if (hit) return hit
  const out = new Map<string, number>()
  const path = CORPUS[sport]
  if (path) {
    try {
      const raw = JSON.parse(readFileSync(path, 'utf8'))
      for (const [alias, v] of Object.entries<any>(raw.aliases || {})) {
        if (v && v.team_id != null) out.set(normaliseName(alias), Number(v.team_id))
      }
    } catch {
      // corpus missing → teams-only resolution; the endpoint still works
    }
  }
  setCache(key, out, 600)
  return out
}

async function loadTeams(sport: string): Promise<TeamRow[]> {
  const key = `fixture-search:teams:${sport}`
  const hit = getCached<TeamRow[]>(key)
  if (hit) return hit
  const supabase = getSupabase()
  const { data } = await supabase
    .from('teams')
    .select('id, name, team_key, league_key')
    .eq('sport', sport)
  const rows = (data || []) as TeamRow[]
  setCache(key, rows, 600)
  return rows
}

/** "Osasuna - Barcelona" / "Οσασούνα vs Μπαρτσελόνα" → [home, away]; no separator → [q]. */
export function splitMatch(q: string): string[] {
  const parts = q.split(/\s+(?:-|–|—|vs\.?|v)\s+/i).map(s => s.trim()).filter(Boolean)
  return parts.length >= 2 ? [parts[0], parts.slice(1).join(' ')] : [q.trim()]
}

/** Candidate team ids for one side, best tier first; empty when nothing matches. */
function resolveTeam(name: string, aliases: Map<string, number>, teams: TeamRow[]): number[] {
  const n = normaliseName(name)
  if (!n) return []
  const exact = aliases.get(n)
  if (exact != null) return [exact]
  const byName = teams.filter(t => normaliseName(t.name) === n || (t.team_key && normaliseName(t.team_key) === n))
  if (byName.length) return byName.map(t => t.id)
  if (n.length < 4) return []
  const contains = teams.filter(t => {
    const tn = normaliseName(t.name)
    return tn.includes(n) || n.includes(tn)
  })
  return contains.slice(0, 8).map(t => t.id)
}

export async function searchFixtures(q: string, date: string, sport = 'football'): Promise<FixtureCandidate[]> {
  const sides = splitMatch(q)
  if (!sides.length || !date) return []
  const [aliases, teams] = [loadAliases(sport), await loadTeams(sport)]
  const teamById = new Map(teams.map(t => [t.id, t]))
  const sideIds = sides.map(s => resolveTeam(s, aliases, teams))
  const anyIds = Array.from(new Set(sideIds.flat()))
  if (!anyIds.length) return []

  const latam = anyIds.some(id => LATAM_KEYS.has(teamById.get(id)?.league_key || ''))
  const window = latam ? WINDOW_LATAM : WINDOW_DAYS
  const target = new Date(`${date}T12:00:00Z`)
  const from = new Date(target.getTime() - window * 86400e3).toISOString()
  const to = new Date(target.getTime() + window * 86400e3).toISOString()

  const supabase = getSupabase()
  const { data } = await supabase
    .from('games')
    .select('id, date, league_key, status, home_team_id, away_team_id, home:teams!games_home_team_id_fkey(name), away:teams!games_away_team_id_fkey(name)')
    .eq('sport', sport)
    .gte('date', from)
    .lte('date', to)
    .or(`home_team_id.in.(${anyIds.join(',')}),away_team_id.in.(${anyIds.join(',')})`)
    .limit(60)

  const [a, b] = [new Set(sideIds[0] || []), new Set(sideIds[1] || [])]
  const both = (g: any) => sides.length === 2 && (
    (a.has(g.home_team_id) && b.has(g.away_team_id)) || (b.has(g.home_team_id) && a.has(g.away_team_id)))

  return ((data || []) as any[])
    .map(g => ({
      game_id: g.id,
      date: g.date,
      league_key: g.league_key,
      home: g.home?.name ?? String(g.home_team_id),
      away: g.away?.name ?? String(g.away_team_id),
      status: g.status,
      matched: (both(g) ? 'both' : 'one') as 'both' | 'one',
    }))
    .sort((x, y) => (x.matched === y.matched ? 0 : x.matched === 'both' ? -1 : 1)
      || Math.abs(new Date(x.date).getTime() - target.getTime()) - Math.abs(new Date(y.date).getTime() - target.getTime()))
    .slice(0, 10)
}
