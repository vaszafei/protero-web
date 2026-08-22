/**
 * Digital twins — the entity layer.
 *
 * A twin is the club, league or player that survives a league change: Coventry
 * is one entity whose ratings carry from the Championship into the Premier
 * League, rather than a team that vanishes and reappears unrated. See
 * protero-ml/ml/twins/README.md.
 *
 * ⚠️ Twins are NOT a pricing input, anywhere, and must never be rendered as
 * one. Owner decision 2026-08-21, and docs/plans/do-not-do.md §2: the twin was
 * scored against the closing line per (league, market) and 55 of 56 cells came
 * back negative. What it is good for is context and a warning surface —
 * "this club has no history in the division it is playing in" — which is
 * exactly the defect that prices a promoted club as mid-table.
 *
 * Everything here reads views the ML side already built and nothing consumed:
 * `twin_fixture_risk`, `twin_team_history`, `twin_league_transitions`.
 */

export interface TwinLeague {
  league_key: string
  sport: string
  tier: number | null
  is_cup: boolean
  n_games: number
  n_teams: number
  avg_goals: number | null
  /** Fitted strength of the competition. Comparable ACROSS leagues; unitless. */
  level: number | null
  home_adv: number | null
  spread: number | null
  state_as_of: string | null
}

export interface TwinTeam {
  team_id: number
  name: string
  sport: string
  current_league: string | null
  current_season: string | null
  /** The league its rating was actually learned in — differs after a move. */
  evidence_league: string | null
  league_changed: boolean
  total_games: number
  leagues_played: Record<string, number>
  seasons_played: Record<string, number>
  attack: number | null
  defence: number | null
  attack_var: number | null
  defence_var: number | null
  /** Effective sample size behind the rating, after time decay. */
  effective_games: number | null
  state_as_of: string | null
}

export interface TwinTeamSeason {
  team_id: number
  name?: string
  season: string
  league_key: string
  tier: number | null
  games: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  gf_per_game: number | null
  ga_per_game: number | null
  points_per_game: number | null
  first_game: string | null
  last_game: string | null
}

export interface TwinFixtureRisk {
  game_id: number
  date: string
  season: string
  league_key: string
  status: string
  home_team: string
  away_team: string
  home_changed_league: boolean
  away_changed_league: boolean
  home_evidence_league: string | null
  away_evidence_league: string | null
  home_games_in_league: number
  away_games_in_league: number
  /** Which side the model is blind on. The view only returns risky fixtures. */
  blind_side: 'home' | 'away' | 'both' | 'neither'
}

export interface TwinTransition {
  team_id: number
  name: string
  from_season: string
  from_league: string
  from_games: number
  from_ppg: number | null
  from_gf_pg: number | null
  to_season: string
  to_league: string
  to_games: number
  direction: string
}

export interface TwinPlayer {
  player_key: string
  player_name: string
  current_team_id: number | null
  appearances: number
  starts: number
  rated_games: number
  avg_rating: number | null
  teams_played: Record<string, number>
  leagues_played: Record<string, number>
  first_seen: string | null
  last_seen: string | null
}

/**
 * Player twins are keyed on the abbreviated name FlashScore publishes
 * ("rodriguez j."), so distinct people with the same short name collapse into
 * one twin: "Rodriguez J." carries 475 appearances across 16 clubs and 14
 * leagues. 1,100 of 27,854 twins touch 5 or more clubs. Treat anything above
 * this as a merged key, not a career.
 */
export const PLAYER_MERGE_TEAM_THRESHOLD = 5

export function isLikelyMergedPlayer(p: Pick<TwinPlayer, 'teams_played'>): boolean {
  return Object.keys(p.teams_played || {}).length >= PLAYER_MERGE_TEAM_THRESHOLD
}

export const useTwins = () => {
  const supabase = useSupabaseClient()

  /** Every competition the twin layer has fitted, strongest first. */
  const fetchTwinLeagues = async (sport = 'football'): Promise<TwinLeague[]> => {
    const { data, error } = await supabase
      .from('twin_league')
      .select('*')
      .eq('sport', sport)
      .order('level', { ascending: false, nullsFirst: false })
    if (error) throw error
    return (data || []) as TwinLeague[]
  }

  /** One competition's twin row. Null for anything the layer has not fitted. */
  const fetchTwinLeague = async (leagueKey: string): Promise<TwinLeague | null> => {
    const { data, error } = await supabase
      .from('twin_league')
      .select('*')
      .eq('league_key', leagueKey)
      .maybeSingle()
    if (error) throw error
    return (data as TwinLeague) || null
  }

  /**
   * Clubs moving INTO or OUT OF one competition. Both directions matter on a
   * league page: who arrived carrying a rating from elsewhere (the blind spot),
   * and who left.
   */
  const fetchLeagueTransitions = async (leagueKey: string, limit = 60): Promise<TwinTransition[]> => {
    const { data, error } = await supabase
      .from('twin_league_transitions')
      .select('*')
      .or(`to_league.eq.${leagueKey},from_league.eq.${leagueKey}`)
      .order('to_season', { ascending: false })
      .limit(Math.min(limit, 300))
    if (error) throw error
    return (data || []) as TwinTransition[]
  }

  const fetchTwinTeam = async (teamId: number): Promise<TwinTeam | null> => {
    const { data, error } = await supabase
      .from('twin_team')
      .select('*')
      .eq('team_id', teamId)
      .maybeSingle()
    if (error) throw error
    return (data as TwinTeam) || null
  }

  /** A club's season-by-season record, including cup runs. Oldest first. */
  const fetchTwinTeamHistory = async (teamId: number): Promise<TwinTeamSeason[]> => {
    const { data, error } = await supabase
      .from('twin_team_history')
      .select('*')
      .eq('team_id', teamId)
      .order('season', { ascending: true })
      .order('league_key', { ascending: true })
    if (error) throw error
    return (data || []) as TwinTeamSeason[]
  }

  /**
   * Clubs, filterable. `changedOnly` narrows to the ones whose rating was
   * learned in a different division — the population worth looking at.
   */
  const fetchTwinTeams = async (opts: {
    league?: string
    search?: string
    changedOnly?: boolean
    limit?: number
  } = {}): Promise<TwinTeam[]> => {
    let q = supabase.from('twin_team').select('*').eq('sport', 'football')
    if (opts.league) q = q.eq('current_league', opts.league)
    if (opts.changedOnly) q = q.eq('league_changed', true)
    if (opts.search) q = q.ilike('name', `%${opts.search}%`)
    const { data, error } = await q
      .order('total_games', { ascending: false })
      .limit(Math.min(opts.limit ?? 200, 500))
    if (error) throw error
    return (data || []) as TwinTeam[]
  }

  /**
   * Fixtures where at least one club has no history in the division it is
   * playing in. The view is pre-filtered to those, so every row is a warning.
   */
  const fetchFixtureRisk = async (opts: { from?: string; to?: string; limit?: number } = {}) => {
    const from = opts.from || new Date().toISOString()
    const to = opts.to || new Date(Date.now() + 30 * 86400_000).toISOString()
    const { data, error } = await supabase
      .from('twin_fixture_risk')
      .select('*')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
      .limit(Math.min(opts.limit ?? 300, 1000))
    if (error) throw error
    return (data || []) as TwinFixtureRisk[]
  }

  /** Risk rows for a specific set of games — for badging a slate. */
  const fetchFixtureRiskFor = async (gameIds: number[]) => {
    if (!gameIds.length) return new Map<number, TwinFixtureRisk>()
    const { data, error } = await supabase
      .from('twin_fixture_risk')
      .select('*')
      .in('game_id', gameIds)
    if (error) throw error
    return new Map((data || []).map((r: any) => [r.game_id, r as TwinFixtureRisk]))
  }

  /** Promotions, relegations and other moves, most recent season first. */
  const fetchTransitions = async (opts: { season?: string; limit?: number } = {}) => {
    let q = supabase.from('twin_league_transitions').select('*')
    if (opts.season) q = q.eq('to_season', opts.season)
    const { data, error } = await q
      .order('to_season', { ascending: false })
      .limit(Math.min(opts.limit ?? 300, 1000))
    if (error) throw error
    return (data || []) as TwinTransition[]
  }

  /** Squad continuity — who is at this club, and where else they have played. */
  const fetchTwinPlayers = async (teamId: number, limit = 40): Promise<TwinPlayer[]> => {
    const { data, error } = await supabase
      .from('twin_player')
      .select('*')
      .eq('current_team_id', teamId)
      .order('appearances', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data || []) as TwinPlayer[]
  }

  return {
    fetchTwinLeagues,
    fetchTwinLeague,
    fetchLeagueTransitions,
    fetchTwinTeam,
    fetchTwinTeamHistory,
    fetchTwinTeams,
    fetchFixtureRisk,
    fetchFixtureRiskFor,
    fetchTransitions,
    fetchTwinPlayers,
  }
}
