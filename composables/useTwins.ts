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
  player_id: string
  full_name: string | null
  player_name: string
  position: string | null
  current_team_id: number | null
  /** Fitted rating, shrunk toward the population mean — the headline number. */
  ability: number | null
  /** Posterior variance of the ability; sqrt is the SD. */
  ability_var: number | null
  /** Time-weighted rated appearances behind the ability. */
  effective_games: number | null
  appearances: number
  starts: number
  rated_games: number
  teams_played: Record<string, number>
  leagues_played: Record<string, number>
  first_seen: string | null
  last_seen: string | null
  /** When the twin fit last ran — the fit is a daily rebuild, not live. */
  state_as_of: string | null
}

/**
 * The basketball twin — three fitted per-36 rates (points, rebounds, assists),
 * each shrunk toward its position-cohort mean with a variance. There is no
 * single 5-10 rating in basketball, so the analogue of football's `ability` is
 * these three latents plus minutes as role context.
 */
export interface BasketballPlayerTwin {
  player_id: string
  player_name: string
  position: string | null
  current_team_id: number | null
  points_rate: number | null
  points_var: number | null
  rebounds_rate: number | null
  rebounds_var: number | null
  assists_rate: number | null
  assists_var: number | null
  /** Fitted plus-minus per 36 minutes (BPM-family: box score → impact). */
  plus_minus_rate: number | null
  plus_minus_var: number | null
  /** Fitted true-shooting percentage (0-100). */
  ts_pct: number | null
  ts_pct_var: number | null
  /** Fitted effective-FG percentage (0-100). */
  efg_pct: number | null
  efg_pct_var: number | null
  /** Recent mean minutes — role context, not a fitted latent. */
  minutes: number | null
  effective_games: number | null
  games: number
  teams_played: Record<string, number>
  first_seen: string | null
  last_seen: string | null
  state_as_of: string | null
}

export interface TwinManager {
  coach_id: string
  coach_name: string | null
  first_seen: string | null
  last_seen: string | null
  games: number
  current_team_id: number | null
  teams_managed: Record<string, number>
  leagues_managed: Record<string, number>
  formations_used: Record<string, number>
  state_as_of: string | null
}

export const useTwins = () => {
  const supabase = useSupabaseClient()

  /**
   * Managers who have held a job in this league, most games first — the
   * league's managerial landscape. Keyed on the FlashScore entity id, never
   * the name. Context only, like every other twin surface: a manager's
   * formation fingerprint is a fact about history, not a price.
   *
   * Filtered in the database by `twin_managers_by_league` — PostgREST has no
   * `jsonb ?` key-existence operator, and a `@>` containment needs a value,
   * not a bare key, so this used to pull the whole corpus and filter it in
   * the browser.
   */
  const fetchTwinManagers = async (leagueKey: string, limit = 12): Promise<TwinManager[]> => {
    const { data, error } = await supabase
      .rpc('twin_managers_by_league', { p_league_key: leagueKey, p_limit: limit })
    if (error) throw error
    return (data || []) as TwinManager[]
  }

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

  /** One club's division changes, oldest first — the carry story for its rating. */
  const fetchTeamTransitions = async (teamId: number): Promise<TwinTransition[]> => {
    const { data, error } = await supabase
      .from('twin_league_transitions')
      .select('*')
      .eq('team_id', teamId)
      .order('to_season', { ascending: true })
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

  /** One player's fitted twin row, keyed by the FS entity id. */
  const fetchTwinPlayer = async (playerId: string): Promise<TwinPlayer | null> => {
    const { data, error } = await supabase
      .from('twin_player')
      .select('*')
      .eq('player_id', playerId)
      .maybeSingle()
    if (error) throw error
    return (data as TwinPlayer) || null
  }

  /**
   * Every fitted player in one position group — the peer strip for a player's
   * ability. Same-position only: a defender's rating is not a striker's.
   */
  const fetchPlayerPositionCohort = async (position: string): Promise<number[]> => {
    const { data, error } = await supabase
      .from('twin_player')
      .select('ability')
      .eq('position', position)
      .not('ability', 'is', null)
    if (error) throw error
    return (data || []).map((r: any) => Number(r.ability)).filter(Number.isFinite)
  }

  /** team_id -> name, for the career-club list. */
  const fetchTeamNames = async (teamIds: (number | string)[]): Promise<Record<string, string>> => {
    if (!teamIds.length) return {}
    const { data, error } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', teamIds)
    if (error) throw error
    return Object.fromEntries((data || []).map((r: any) => [String(r.id), r.name]))
  }

  /** One basketball player's fitted twin row, keyed by the FS entity id. */
  const fetchBasketballTwinPlayer = async (playerId: string): Promise<BasketballPlayerTwin | null> => {
    const { data, error } = await supabase
      .from('twin_basketball_player')
      .select('*')
      .eq('player_id', playerId)
      .maybeSingle()
    if (error) throw error
    return (data as BasketballPlayerTwin) || null
  }

  /**
   * Resolve an NBA personId (integer) to the FlashScore entity id the twin is
   * keyed on. Returns null when the id is not a personId or has no mapping
   * (the 5 name-collision conflicts stay unresolved by design).
   */
  const resolveBasketballPlayerId = async (id: string): Promise<string | null> => {
    if (!/^\d+$/.test(id)) return null
    const { data, error } = await supabase
      .from('basketball_player_ids')
      .select('player_id')
      .eq('source', 'nba_api')
      .eq('external_id', id)
      .not('player_id', 'is', null)
      .maybeSingle()
    if (error) throw error
    return (data as any)?.player_id ?? null
  }

  /**
   * Fitted latents of every fitted player in one position group — the peer
   * strip for a basketball player. Same-position only: a center's rebounds
   * are not a guard's. Returns `{ points, rebounds, assists, plusMinus,
   * tsPct, efgPct }` arrays.
   */
  const fetchBasketballPositionCohort = async (position: string) => {
    const { data, error } = await supabase
      .from('twin_basketball_player')
      .select('points_rate, rebounds_rate, assists_rate, plus_minus_rate, ts_pct, efg_pct')
      .eq('position', position)
      .not('points_rate', 'is', null)
    if (error) throw error
    const rows = (data || []) as any[]
    return {
      points: rows.map((r) => Number(r.points_rate)).filter(Number.isFinite),
      rebounds: rows.map((r) => Number(r.rebounds_rate)).filter(Number.isFinite),
      assists: rows.map((r) => Number(r.assists_rate)).filter(Number.isFinite),
      plusMinus: rows.map((r) => Number(r.plus_minus_rate)).filter(Number.isFinite),
      tsPct: rows.map((r) => Number(r.ts_pct)).filter(Number.isFinite),
      efgPct: rows.map((r) => Number(r.efg_pct)).filter(Number.isFinite),
    }
  }

  return {
    fetchTeamTransitions,
    fetchTwinLeagues,
    fetchTwinLeague,
    fetchLeagueTransitions,
    fetchTwinManagers,
    fetchTwinTeam,
    fetchTwinTeamHistory,
    fetchTwinTeams,
    fetchFixtureRisk,
    fetchFixtureRiskFor,
    fetchTransitions,
    fetchTwinPlayers,
    fetchTwinPlayer,
    fetchPlayerPositionCohort,
    fetchTeamNames,
    fetchBasketballTwinPlayer,
    fetchBasketballPositionCohort,
    resolveBasketballPlayerId,
  }
}
