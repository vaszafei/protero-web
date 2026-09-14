/**
 * Reads `competition_rules` (unified-analysis-layer Track B, 55 rows, one per
 * `league_key`) — the first frontend consumer of the registry. Every
 * `league_key` present in `games` is expected to have a row (`bin/check-
 * competition-rules.mjs` gates this on the Node side); a miss here is a real
 * gap, not a competition the frontend has never heard of, so it is reported
 * loudly rather than silently defaulted — same convention Track B used for
 * `ingest_close.py`.
 */

export interface CompetitionRules {
  league_key: string
  sport: 'football' | 'basketball'
  format: string | null
  two_legged: boolean | null
  extra_time: boolean | null
  penalties: boolean | null
  away_goals_rule: string | null
  season_convention: string | null
  periods: number | null
  period_length: number | null
  ot_rules: string | null
  promotion_relegation: boolean | null
  notes: string | null
}

export async function fetchCompetitionRules(supabase: any, leagueKey: string): Promise<CompetitionRules | null> {
  const res = await supabase
    .from('competition_rules')
    .select('*')
    .eq('league_key', leagueKey)
    .maybeSingle()

  if (res.error) {
    throw createError({ statusCode: 500, message: `competition_rules query failed: ${res.error.message}` })
  }
  if (!res.data) {
    console.error(`[analysis] competition_rules has no row for league_key="${leagueKey}" — registry gap, not a silent default`)
    return null
  }
  return res.data as CompetitionRules
}
