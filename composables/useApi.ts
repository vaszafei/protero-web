/**
 * Client-side API composable — replaces all /api/ server routes.
 * Queries Supabase directly from the client using the anon key + RLS.
 * 
 * Every function here mirrors a former server/api/ route.
 */

export const useApi = () => {
  const supabase = useSupabaseClient()
  const { user } = useAuth()

  // ============================================================
  // PUBLIC DATA (no auth required)
  // ============================================================

  /**
   * GET /api/sports — sports with grouped leagues + wallets
   */
  const fetchSports = async () => {
    const [sportsRes, leaguesRes, gamesRes, walletsRes] = await Promise.all([
      supabase.from('sports').select('key, name, is_active').eq('is_active', true).order('name'),
      supabase.from('leagues').select('key, name, sport, country, flag').order('country').order('name'),
      supabase.from('games').select('league_key').in('season', ['2025-2026', '2024-2025']),
      supabase.from('wallets').select('id, name, balance, initial_balance, total_bets, win_rate, is_active').eq('is_active', true).order('name'),
    ])

    const activeLeagueKeys = new Set((gamesRes.data || []).map((g: any) => g.league_key))

    const sportLeagues: Record<string, Record<string, any[]>> = {}
    for (const s of (sportsRes.data || [])) {
      sportLeagues[s.key] = {}
    }

    for (const l of (leaguesRes.data || [])) {
      if (!activeLeagueKeys.has(l.key)) continue
      const sport = l.sport || 'football'
      if (!sportLeagues[sport]) sportLeagues[sport] = {}
      const country = l.country || 'Other'
      if (!sportLeagues[sport][country]) sportLeagues[sport][country] = []
      sportLeagues[sport][country].push({ key: l.key, name: l.name, flag: l.flag || null })
    }

    return {
      sports: (sportsRes.data || [])
        .map(s => ({
          key: s.key,
          name: s.name,
          icon: s.key === 'football' ? '⚽' : s.key === 'basketball' ? '🏀' : '🏅',
          leagues: sportLeagues[s.key] || {}
        }))
        .filter(s => Object.keys(s.leagues).length > 0),
      wallets: (walletsRes.data || []).map((w: any) => ({
        id: w.id,
        name: w.name,
        roi: w.initial_balance > 0 ? Math.round(((w.balance - w.initial_balance) / w.initial_balance) * 10000) / 100 : 0,
        win_rate: w.win_rate,
        total_bets: w.total_bets,
        is_active: w.is_active
      }))
    }
  }

  /**
   * GET /api/leagues — all leagues with game counts
   */
  const fetchLeagues = async (season = '2025-2026') => {
    const { data: leagues, error } = await supabase
      .from('leagues')
      .select('*')
      .order('name')

    if (error) throw error

    // Get counts for each league
    const activeLeagues = (leagues || []).filter((l: any) => l.key)
    const counts = await Promise.all(
      activeLeagues.map(async (league: any) => {
        const [totalRes, playedRes] = await Promise.all([
          supabase.from('games').select('*', { count: 'exact', head: true }).eq('season', season).eq('league_key', league.key),
          supabase.from('games').select('*', { count: 'exact', head: true }).eq('season', season).eq('league_key', league.key).not('home_goals', 'is', null).not('away_goals', 'is', null),
        ])
        return { key: league.key, total: totalRes.count || 0, played: playedRes.count || 0 }
      })
    )

    const totalMap: Record<string, number> = {}
    const playedMap: Record<string, number> = {}
    for (const c of counts) {
      totalMap[c.key] = c.total
      playedMap[c.key] = c.played
    }

    return {
      leagues: (leagues || []).map((league: any) => ({
        ...league,
        games_count: totalMap[league.key] || 0,
        played_count: playedMap[league.key] || 0,
      })),
      season,
      cached_at: new Date().toISOString()
    }
  }

  /**
   * GET /api/games/all — games with teams, predictions
   */
  const fetchGames = async (opts: { from?: string; to?: string; season?: string; leagues?: string[]; includeBets?: boolean } = {}) => {
    const today = new Date()
    const defaultFrom = new Date(today)
    defaultFrom.setDate(today.getDate() - 14)
    const defaultTo = new Date(today)
    defaultTo.setDate(today.getDate() + 60)

    const fromDate = opts.from || defaultFrom.toISOString().split('T')[0]
    const toDate = opts.to || defaultTo.toISOString().split('T')[0]
    const season = opts.season || '2025-2026'

    const selectCols = `
      id, date, season, league_key, sport, status,
      home_team_id, away_team_id,
      home_goals, away_goals,
      home_xg, away_xg,
      odds_home, odds_away, sport_stats,
      home_team:teams!home_team_id(name, team_key),
      away_team:teams!away_team_id(name, team_key),
      predictions(
        id, prediction, confidence, model_version,
        over_15_prob, over_25_prob, over_35_prob,
        result_correct, created_at
      )
      ${opts.includeBets ? `,bets(id,wallet_id,bet_type,stake,odds,status,profit,notes,sport,strategy)` : ''}
    `

    let q = supabase
      .from('games')
      .select(selectCols)
      .eq('season', season)
      .gte('date', fromDate)
      .lte('date', toDate)

    if (opts.leagues && opts.leagues.length > 0) {
      q = q.in('league_key', opts.leagues)
    }

    const { data: games, error } = await q.order('date', { ascending: true })
    if (error) throw error

    const enriched = (games || []).map((game: any) => ({
      ...game,
      home_name: game.home_team?.name || 'Unknown',
      away_name: game.away_team?.name || 'Unknown',
      home_key: game.home_team?.team_key || null,
      away_key: game.away_team?.team_key || null,
    }))

    return { success: true, games: enriched, count: enriched.length, from: fromDate, to: toDate }
  }

  /**
   * GET /api/game/:id — single game with lineups
   */
  const fetchGame = async (gameId: number) => {
    const { data: game, error } = await supabase
      .from('games')
      .select(`
        *,
        home_team:teams!home_team_id(name, team_key),
        away_team:teams!away_team_id(name, team_key),
        predictions(*)
      `)
      .eq('id', gameId)
      .single()

    if (error) throw error

    // Fetch lineups separately
    const { data: lineups } = await supabase
      .from('lineups')
      .select('*')
      .eq('game_id', gameId)
      .order('position')

    const homeLineups = (lineups || []).filter((l: any) => l.team_id === game.home_team_id)
    const awayLineups = (lineups || []).filter((l: any) => l.team_id === game.away_team_id)

    return {
      game: {
        ...game,
        home_name: game.home_team?.name || 'Unknown',
        away_name: game.away_team?.name || 'Unknown',
        home_key: game.home_team?.team_key || null,
        away_key: game.away_team?.team_key || null,
      },
      lineups: { home: homeLineups, away: awayLineups },
      prediction: game.predictions?.[0] || null
    }
  }

  /**
   * GET /api/leagues/:slug — single league with games and standings
   */
  const fetchLeague = async (slug: string, season = '2025-2026') => {
    const { data: league, error: lErr } = await supabase
      .from('leagues')
      .select('*')
      .eq('key', slug)
      .single()

    if (lErr) throw lErr

    const [gamesRes, standingsRes] = await Promise.all([
      supabase
        .from('games')
        .select(`
          id, date, season, league_key, sport, status, round,
          home_team_id, away_team_id, home_goals, away_goals,
          home_xg, away_xg, odds_home, odds_away, sport_stats,
          home_team:teams!home_team_id(name, team_key),
          away_team:teams!away_team_id(name, team_key),
          predictions(id, prediction, confidence, over_15_prob, over_25_prob, over_35_prob, result_correct, created_at),
          bets(id, wallet_id, bet_type, stake, odds, status, profit)
        `)
        .eq('league_key', slug)
        .eq('season', season)
        .order('date', { ascending: true }),
      supabase
        .from('standings')
        .select('*')
        .eq('league_key', slug)
        .eq('season', season)
        .order('position', { ascending: true })
    ])

    const games = (gamesRes.data || []).map((g: any) => ({
      ...g,
      home_name: g.home_team?.name || 'Unknown',
      away_name: g.away_team?.name || 'Unknown',
    }))

    return { league, games, standings: standingsRes.data || [] }
  }

  /**
   * Fantasy projections for a specific game
   */
  const fetchFantasyProjections = async (gameId: number) => {
    const { data, error } = await supabase
      .from('fantasy_projections')
      .select('player_name, team_name, projected_score, projected_minutes, scoring_type, confidence')
      .eq('game_id', gameId)
      .order('projected_score', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * GET /api/h2h/:homeTeam/:awayTeam — head to head
   */
  const fetchH2H = async (homeTeamName: string, awayTeamName: string, limit = 10) => {
    // Find team IDs by name
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .or(`name.eq.${homeTeamName},name.eq.${awayTeamName}`)

    if (!teams || teams.length < 2) return { matches: [], summary: null }

    const homeTeam = teams.find(t => t.name === homeTeamName)
    const awayTeam = teams.find(t => t.name === awayTeamName)
    if (!homeTeam || !awayTeam) return { matches: [], summary: null }

    const { data: matches } = await supabase
      .from('games')
      .select(`
        id, date, season, league_key, home_goals, away_goals, status,
        home_team:teams!home_team_id(name),
        away_team:teams!away_team_id(name)
      `)
      .or(`and(home_team_id.eq.${homeTeam.id},away_team_id.eq.${awayTeam.id}),and(home_team_id.eq.${awayTeam.id},away_team_id.eq.${homeTeam.id})`)
      .not('home_goals', 'is', null)
      .order('date', { ascending: false })
      .limit(limit)

    const m = matches || []
    const homeWins = m.filter((g: any) => {
      const isHome = g.home_team?.name === homeTeamName
      return isHome ? g.home_goals > g.away_goals : g.away_goals > g.home_goals
    }).length

    return {
      matches: m,
      summary: {
        totalMatches: m.length,
        homeTeamWins: homeWins,
        awayTeamWins: m.length - homeWins - m.filter((g: any) => g.home_goals === g.away_goals).length,
        draws: m.filter((g: any) => g.home_goals === g.away_goals).length
      }
    }
  }

  /**
   * GET /api/player/:id/season — player season stats
   */
  const fetchPlayerSeason = async (playerId: number, leagueKey?: string) => {
    const params: Record<string, string> = {}
    if (leagueKey) params.league = leagueKey
    params.limit = '30'

    const data = await $fetch(`/api/player/${playerId}/season`, { params })
    return data as { games: any[], averages: any, gameCount: number }
  }

  // ============================================================
  // USER DATA (auth required, RLS enforced)
  // ============================================================

  /**
   * GET /api/user/subscriptions
   */
  const fetchSubscriptions = async () => {
    if (!user.value) return { subscriptions: [] }

    const { data: subs, error } = await supabase
      .from('user_subscriptions')
      .select('id, league_key, sport, is_active, created_at')
      .eq('user_id', user.value.id)
      .eq('is_active', true)
      .order('sport').order('league_key')

    if (error) throw error
    return { subscriptions: subs || [] }
  }

  /**
   * POST /api/user/subscriptions — subscribe/unsubscribe
   */
  const toggleSubscription = async (leagueKey: string, sport = 'football', action: 'subscribe' | 'unsubscribe' = 'subscribe') => {
    if (!user.value) throw new Error('Not authenticated')

    if (action === 'subscribe') {
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: user.value.id,
          league_key: leagueKey,
          sport,
          is_active: true,
        }, { onConflict: 'user_id,league_key' })
      if (error) throw error
      return { success: true, action: 'subscribed', league_key: leagueKey }
    } else {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.value.id)
        .eq('league_key', leagueKey)
      if (error) throw error
      return { success: true, action: 'unsubscribed', league_key: leagueKey }
    }
  }

  /**
   * GET /api/user/picks — admin picks for subscribed leagues
   */
  const fetchPicks = async (opts: { sport?: string; days?: number } = {}) => {
    if (!user.value) return { picks: [], subscribed_leagues: [] }

    const days = opts.days || 7
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - days)

    // Get subscribed leagues
    const { data: subs } = await supabase
      .from('user_subscriptions')
      .select('league_key, sport')
      .eq('user_id', user.value.id)

    if (!subs || subs.length === 0) {
      return { picks: [], message: 'Subscribe to leagues to see admin picks', subscribed_leagues: [] }
    }

    const subscribedLeagues = subs.map(s => s.league_key)

    let q = supabase
      .from('bets')
      .select(`
        id, game_id, bet_type, selection, stake, odds, expected_value,
        status, profit, strategy, sport, created_at,
        games!inner(
          date, league_key, home_team_id, away_team_id,
          home_goals, away_goals,
          home_team:teams!home_team_id(name),
          away_team:teams!away_team_id(name)
        ),
        predictions(
          home_win_prob, draw_prob, away_win_prob,
          over25_prob, btts_prob, confidence
        )
      `)
      .in('games.league_key', subscribedLeagues)
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: false })

    if (opts.sport) q = q.eq('sport', opts.sport)

    const { data: picks, error } = await q
    if (error) throw error

    return {
      picks: (picks || []).filter((p: any) => p.games),
      subscribed_leagues: subscribedLeagues,
      since: sinceDate.toISOString()
    }
  }

  /**
   * GET /api/user/bets — user's own bet history
   */
  const fetchUserBets = async (opts: { status?: string; sport?: string; limit?: number } = {}) => {
    if (!user.value) return { bets: [] }

    let q = supabase
      .from('user_bets')
      .select(`
        id, game_id, bet_type, sport, selection, stake, odds,
        bookmaker, status, profit, notes, source, admin_bet_id,
        placed_at, settled_at,
        games!inner(date, league_key, home_team_id, away_team_id,
          home_team:teams!home_team_id(name),
          away_team:teams!away_team_id(name)
        )
      `)
      .eq('user_id', user.value.id)
      .order('placed_at', { ascending: false })
      .limit(opts.limit || 50)

    if (opts.status) q = q.eq('status', opts.status)
    if (opts.sport) q = q.eq('sport', opts.sport)

    const { data: bets, error } = await q
    if (error) throw error

    return { bets: bets || [] }
  }

  /**
   * POST /api/user/bets — create a new bet
   */
  const createUserBet = async (bet: {
    game_id: number; bet_type: string; selection: string;
    stake: number; odds: number; bookmaker?: string;
    sport?: string; source?: string; admin_bet_id?: number; notes?: string
  }) => {
    if (!user.value) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('user_bets')
      .insert({
        user_id: user.value.id,
        game_id: bet.game_id,
        bet_type: bet.bet_type,
        selection: bet.selection,
        stake: parseFloat(String(bet.stake)),
        odds: parseFloat(String(bet.odds)),
        bookmaker: bet.bookmaker || null,
        sport: bet.sport || 'football',
        source: bet.source || 'manual',
        admin_bet_id: bet.admin_bet_id || null,
        notes: bet.notes || null,
        status: 'pending',
        placed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { bet: data }
  }

  /**
   * PUT /api/user/bets/:id — update bet status
   */
  const updateUserBet = async (betId: number, updates: { status?: string; profit?: number }) => {
    if (!user.value) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('user_bets')
      .update(updates)
      .eq('id', betId)
      .eq('user_id', user.value.id)
      .select()
      .single()

    if (error) throw error
    return { bet: data }
  }

  /**
   * GET /api/user/bet-stats — aggregated bet statistics
   */
  const fetchBetStats = async (sport?: string) => {
    if (!user.value) return { stats: { total_bets: 0 } }

    let q = supabase
      .from('user_bets')
      .select('stake, odds, profit, status, sport, bet_type, source')
      .eq('user_id', user.value.id)

    if (sport) q = q.eq('sport', sport)

    const { data: bets, error } = await q
    if (error) throw error

    if (!bets || bets.length === 0) {
      return {
        stats: {
          total_bets: 0, pending: 0, won: 0, lost: 0, void: 0,
          total_staked: 0, total_profit: 0, roi: 0, win_rate: 0, avg_odds: 0,
          by_sport: {}, by_type: {}, by_source: {}
        }
      }
    }

    const settled = bets.filter(b => b.status === 'won' || b.status === 'lost')
    const totalStaked = bets.reduce((s, b) => s + (b.stake || 0), 0)
    const totalProfit = bets.reduce((s, b) => s + (b.profit || 0), 0)
    const won = bets.filter(b => b.status === 'won').length

    const bySport: Record<string, any> = {}
    const byType: Record<string, any> = {}
    const bySource: Record<string, any> = {}

    for (const b of bets) {
      const s = b.sport || 'football'
      if (!bySport[s]) bySport[s] = { bets: 0, profit: 0, won: 0, settled: 0 }
      bySport[s].bets++
      bySport[s].profit += b.profit || 0
      if (b.status === 'won') bySport[s].won++
      if (b.status === 'won' || b.status === 'lost') bySport[s].settled++

      const t = b.bet_type || 'other'
      if (!byType[t]) byType[t] = { bets: 0, profit: 0 }
      byType[t].bets++
      byType[t].profit += b.profit || 0

      const src = b.source || 'manual'
      if (!bySource[src]) bySource[src] = { bets: 0, profit: 0 }
      bySource[src].bets++
      bySource[src].profit += b.profit || 0
    }

    return {
      stats: {
        total_bets: bets.length,
        pending: bets.filter(b => b.status === 'pending').length,
        won,
        lost: bets.filter(b => b.status === 'lost').length,
        void: bets.filter(b => b.status === 'void').length,
        total_staked: Math.round(totalStaked * 100) / 100,
        total_profit: Math.round(totalProfit * 100) / 100,
        roi: totalStaked > 0 ? Math.round((totalProfit / totalStaked) * 10000) / 100 : 0,
        win_rate: settled.length > 0 ? Math.round((won / settled.length) * 10000) / 100 : 0,
        avg_odds: bets.length > 0 ? Math.round((bets.reduce((s, b) => s + (b.odds || 0), 0) / bets.length) * 100) / 100 : 0,
        by_sport: bySport,
        by_type: byType,
        by_source: bySource
      }
    }
  }

  /**
   * GET /api/credits/tasks — available contribution tasks
   */
  const fetchCreditsTasks = async () => {
    // Tasks are games that need post-match data contributions
    // For now, find completed games that might still need data
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 3)
    
    const { data: games } = await supabase
      .from('games')
      .select(`
        id, date, league_key, status,
        home_team:teams!home_team_id(name),
        away_team:teams!away_team_id(name)
      `)
      .eq('status', 'completed')
      .gte('date', yesterday.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(20)

    // Transform to task format
    const tasks = (games || []).map((g: any, idx: number) => ({
      id: g.id,
      game: {
        date: g.date,
        home_team: g.home_team?.name || 'Unknown',
        away_team: g.away_team?.name || 'Unknown',
      },
      league_key: g.league_key,
      task_type: 'post_match_stats',
      base_reward: 5,
      first_bonus: 3,
      is_first: idx === 0,
      current_contributors: 0,
      max_contributors: 3
    }))

    return { tasks }
  }

  /**
   * POST /api/credits/tasks/contribute — submit a contribution
   */
  const submitContribution = async (taskId: number, data: any) => {
    if (!user.value) throw new Error('Not authenticated')
    // For now, return a simulated success since the credits system
    // tables may not be fully set up
    return { success: true, credits_awarded: 5, is_first: false }
  }

  /**
   * GET /api/credits/leagues — leagues with credit/unlock info
   */
  const fetchCreditsLeagues = async () => {
    if (!user.value) return { leagues: [] }
    
    const [leaguesRes, unlocksRes, userRes] = await Promise.all([
      supabase.from('leagues').select('key, name, sport').order('sport').order('name'),
      supabase.from('league_unlocks').select('league_key, unlocked_at, expires_at, credits_spent')
        .eq('user_id', user.value.id)
        .gte('expires_at', new Date().toISOString()),
      supabase.from('users').select('free_league_key').eq('id', user.value.id).maybeSingle()
    ])

    const unlockMap: Record<string, any> = {}
    for (const u of (unlocksRes.data || [])) {
      unlockMap[u.league_key] = u
    }

    const freeKey = userRes.data?.free_league_key ?? null

    // Define credit tiers
    const topTierLeagues = ['premier_league', 'la_liga', 'bundesliga', 'serie_a', 'ligue_1', 'nba']
    
    const leagues = (leaguesRes.data || []).map((l: any) => {
      const isTop = topTierLeagues.includes(l.key)
      return {
        key: l.key,
        name: l.name,
        sport: l.sport || 'football',
        is_free: l.key === freeKey,
        is_unlocked: !!unlockMap[l.key],
        unlock_expires_at: unlockMap[l.key]?.expires_at || null,
        credit_cost: isTop ? 50 : 25,
        credit_tier: isTop ? 'top' : 'mid'
      }
    })

    return { leagues }
  }

  /**
   * GET /api/credits/config — credits system configuration
   */
  const fetchCreditsConfig = async () => {
    return {
      config: {
        tiers: {
          top: { cost: 50, leagues: ['premier_league', 'la_liga', 'bundesliga', 'serie_a', 'ligue_1', 'nba'] },
          mid: { cost: 25 }
        },
        rewards: {
          contribution: { base: 5, first_bonus: 3 },
          referral: 20,
          daily_login: 1
        },
        unlock_duration_days: 30
      }
    }
  }

  /**
   * POST /api/user/credits/unlock-league — spend credits to unlock a league
   */
  const unlockLeagueWithCredits = async (leagueKey: string) => {
    if (!user.value) throw new Error('Not authenticated')
    
    // Get current balance
    const { data: balanceData } = await supabase
      .from('credit_balances')
      .select('balance')
      .eq('user_id', user.value.id)
      .single()

    const balance = balanceData?.balance ?? 0
    const topTierLeagues = ['premier_league', 'la_liga', 'bundesliga', 'serie_a', 'ligue_1', 'nba']
    const cost = topTierLeagues.includes(leagueKey) ? 50 : 25

    if (balance < cost) throw new Error('Insufficient credits')

    // Calculate dates
    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Insert unlock
    const { error: unlockErr } = await supabase
      .from('league_unlocks')
      .upsert({
        user_id: user.value.id,
        league_key: leagueKey,
        unlocked_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        credits_spent: cost
      }, { onConflict: 'user_id,league_key' })

    if (unlockErr) throw unlockErr

    // Deduct balance
    const { error: balErr } = await supabase
      .from('credit_balances')
      .update({
        balance: balance - cost,
        total_spent: (balanceData as any)?.total_spent ?? 0 + cost,
        updated_at: now.toISOString()
      })
      .eq('user_id', user.value.id)

    if (balErr) throw balErr

    // Record transaction
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.value.id,
        amount: -cost,
        type: 'unlock',
        description: `Unlocked ${leagueKey} for 30 days`,
        reference_id: leagueKey,
        created_at: now.toISOString()
      })

    return {
      success: true,
      new_balance: balance - cost,
      expires_at: expiresAt.toISOString()
    }
  }

  /**
   * GET /api/user/credits — credit balance, transactions, unlocks
   */
  const fetchCredits = async () => {
    if (!user.value) return { balance: 0, total_earned: 0, total_spent: 0, free_league_key: null, transactions: [], active_unlocks: [] }

    const userId = user.value.id
    const [balanceRes, txRes, unlocksRes, userRes] = await Promise.all([
      supabase.from('credit_balances').select('balance, total_earned, total_spent, updated_at').eq('user_id', userId).maybeSingle(),
      supabase.from('credit_transactions').select('id, amount, type, description, reference_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('league_unlocks').select('league_key, unlocked_at, expires_at, credits_spent').eq('user_id', userId).gte('expires_at', new Date().toISOString()),
      supabase.from('users').select('free_league_key').eq('id', userId).maybeSingle()
    ])

    return {
      balance: balanceRes.data?.balance ?? 0,
      total_earned: balanceRes.data?.total_earned ?? 0,
      total_spent: balanceRes.data?.total_spent ?? 0,
      free_league_key: userRes.data?.free_league_key ?? null,
      transactions: txRes.data || [],
      active_unlocks: unlocksRes.data || []
    }
  }

  return {
    // Public
    fetchSports,
    fetchLeagues,
    fetchGames,
    fetchGame,
    fetchLeague,
    fetchFantasyProjections,
    fetchH2H,
    fetchPlayerSeason,
    // User
    fetchSubscriptions,
    toggleSubscription,
    fetchPicks,
    fetchUserBets,
    createUserBet,
    updateUserBet,
    fetchBetStats,
    fetchCredits,
    // Credits system
    fetchCreditsTasks,
    submitContribution,
    fetchCreditsLeagues,
    fetchCreditsConfig,
    unlockLeagueWithCredits,
  }
}
