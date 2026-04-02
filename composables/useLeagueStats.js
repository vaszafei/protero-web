export function useLeagueStats(games) {
  // Compute standings from match data
  const computedStandings = computed(() => {
    if (!games.value || games.value.length === 0) return {}

    const teams = {}

    games.value.forEach(game => {
      if (game.home_goals === null || game.away_goals === null) return

      // Initialize teams with full stats tracking
      if (!teams[game.home_name]) {
        teams[game.home_name] = {
          name: game.home_name,
          matches: [],
          homeMatches: [],
          awayMatches: [],
          // Stats aggregators
          total_possession: 0,
          possession_count: 0,
          total_shots: 0,
          total_corners: 0,
          total_yellow_cards: 0,
          games_over_25: 0,
          btts_count: 0
        }
      }
      if (!teams[game.away_name]) {
        teams[game.away_name] = {
          name: game.away_name,
          matches: [],
          homeMatches: [],
          awayMatches: [],
          // Stats aggregators
          total_possession: 0,
          possession_count: 0,
          total_shots: 0,
          total_corners: 0,
          total_yellow_cards: 0,
          games_over_25: 0,
          btts_count: 0
        }
      }

      const totalGoals = game.home_goals + game.away_goals
      let homeResult, awayResult

      if (game.home_goals > game.away_goals) {
        homeResult = 'W'
        awayResult = 'L'
      } else if (game.home_goals < game.away_goals) {
        homeResult = 'L'
        awayResult = 'W'
      } else {
        homeResult = 'D'
        awayResult = 'D'
      }

      const homeMatch = {
        round: game.round,
        opponent: game.away_name,
        goalsFor: game.home_goals,
        goalsAgainst: game.away_goals,
        totalGoals: totalGoals,
        result: homeResult,
        isHome: true
      }

      const awayMatch = {
        round: game.round,
        opponent: game.home_name,
        goalsFor: game.away_goals,
        goalsAgainst: game.home_goals,
        totalGoals: totalGoals,
        result: awayResult,
        isHome: false
      }

      teams[game.home_name].matches.push(homeMatch)
      teams[game.home_name].homeMatches.push(homeMatch)
      teams[game.away_name].matches.push(awayMatch)
      teams[game.away_name].awayMatches.push(awayMatch)

      // Aggregate stats for home team
      if (game.home_possession_pct) {
        teams[game.home_name].total_possession += game.home_possession_pct
        teams[game.home_name].possession_count++
      }
      if (game.home_shots) teams[game.home_name].total_shots += game.home_shots
      if (game.home_corners) teams[game.home_name].total_corners += game.home_corners
      if (game.home_yellow_cards) teams[game.home_name].total_yellow_cards += game.home_yellow_cards

      // Aggregate stats for away team
      if (game.away_possession_pct) {
        teams[game.away_name].total_possession += game.away_possession_pct
        teams[game.away_name].possession_count++
      }
      if (game.away_shots) teams[game.away_name].total_shots += game.away_shots
      if (game.away_corners) teams[game.away_name].total_corners += game.away_corners
      if (game.away_yellow_cards) teams[game.away_name].total_yellow_cards += game.away_yellow_cards

      // Track over 2.5 and BTTS for both teams
      if (totalGoals > 2.5) {
        teams[game.home_name].games_over_25++
        teams[game.away_name].games_over_25++
      }
      if (game.home_goals > 0 && game.away_goals > 0) {
        teams[game.home_name].btts_count++
        teams[game.away_name].btts_count++
      }
    })

    // Calculate averages and derived stats for each team
    Object.values(teams).forEach(team => {
      team.matches.sort((a, b) => a.round - b.round)
      team.form = team.matches.slice(-5).map(m => m.result)
      team.formDetails = team.matches.slice(-5)

      const totalGames = team.matches.length
      
      // Calculate averages (used by PredictionsView)
      team.avg_possession = team.possession_count > 0 
        ? (team.total_possession / team.possession_count).toFixed(1) 
        : null
      team.avg_shots = totalGames > 0 
        ? (team.total_shots / totalGames).toFixed(1) 
        : null
      team.avg_corners = totalGames > 0 
        ? (team.total_corners / totalGames).toFixed(1) 
        : null
      team.avg_yellow_cards = totalGames > 0 
        ? (team.total_yellow_cards / totalGames).toFixed(1) 
        : null
      team.over_25_pct = totalGames > 0 
        ? Math.round((team.games_over_25 / totalGames) * 100) 
        : 0
      team.btts_pct = totalGames > 0 
        ? Math.round((team.btts_count / totalGames) * 100) 
        : 0
    })

    return teams
  })

  // Round statistics
  const roundStatistics = computed(() => {
    if (!games.value) return []

    const rounds = {}

    games.value.forEach(game => {
      if (game.home_goals === null || game.away_goals === null) return

      if (!rounds[game.round]) {
        rounds[game.round] = {
          round: game.round,
          matches: 0,
          totalGoals: 0,
          over25: 0,
          under25: 0,
          btts: 0,
          cleanSheets: 0
        }
      }

      const totalGoals = game.home_goals + game.away_goals
      rounds[game.round].matches++
      rounds[game.round].totalGoals += totalGoals

      if (totalGoals > 2.5) rounds[game.round].over25++
      else rounds[game.round].under25++

      if (game.home_goals > 0 && game.away_goals > 0) rounds[game.round].btts++
      if (game.home_goals === 0 || game.away_goals === 0) rounds[game.round].cleanSheets++
    })

    return Object.values(rounds).map(r => ({
      ...r,
      avgGoals: (r.totalGoals / r.matches).toFixed(2),
      over25Count: r.over25,
      over25Pct: Math.round((r.over25 / r.matches) * 100),
      under25Count: r.under25,
      under25Pct: Math.round((r.under25 / r.matches) * 100),
      bttsCount: r.btts,
      bttsPct: Math.round((r.btts / r.matches) * 100),
      cleanSheets: r.cleanSheets,
      cleanSheetsPct: Math.round((r.cleanSheets / r.matches) * 100)
    })).sort((a, b) => a.round - b.round)
  })

  // Overall statistics
  const overallStats = computed(() => {
    if (!games.value) return {
      totalMatches: 0,
      totalGoals: 0,
      avgGoalsPerMatch: '0.00',
      over25: 0,
      over25Pct: 0,
      btts: 0,
      bttsPct: 0,
      cleanSheets: 0,
      cleanSheetsPct: 0,
      avgPossession: '0.0',
      avgShots: '0.0',
      avgCorners: '0.0',
      avgYellowCards: '0.0'
    }

    // Single-pass algorithm - process all stats in one iteration
    const stats = games.value
      .filter(g => g.home_goals !== null && g.away_goals !== null)
      .reduce((acc, game) => {
        const goals = game.home_goals + game.away_goals
        
        // Basic stats
        acc.totalMatches++
        acc.totalGoals += goals
        
        // Goals thresholds
        if (goals > 2.5) acc.over25++
        
        // BTTS
        if (game.home_goals > 0 && game.away_goals > 0) acc.btts++
        
        // Clean sheets
        if (game.home_goals === 0 || game.away_goals === 0) acc.cleanSheets++
        
        // Enriched stats (count both teams)
        if (game.home_possession_pct) {
          acc.totalPossession += game.home_possession_pct
          acc.possessionCount++
        }
        if (game.away_possession_pct) {
          acc.totalPossession += game.away_possession_pct
          acc.possessionCount++
        }
        if (game.home_shots) acc.totalShots += game.home_shots
        if (game.away_shots) acc.totalShots += game.away_shots
        if (game.home_corners) acc.totalCorners += game.home_corners
        if (game.away_corners) acc.totalCorners += game.away_corners
        if (game.home_yellow_cards) acc.totalYellowCards += game.home_yellow_cards
        if (game.away_yellow_cards) acc.totalYellowCards += game.away_yellow_cards
        
        return acc
      }, {
        totalMatches: 0,
        totalGoals: 0,
        over25: 0,
        btts: 0,
        cleanSheets: 0,
        totalPossession: 0,
        possessionCount: 0,
        totalShots: 0,
        totalCorners: 0,
        totalYellowCards: 0
      })
    
    const totalTeamGames = stats.totalMatches * 2 // Each match has 2 teams

    return {
      totalMatches: stats.totalMatches,
      totalGoals: stats.totalGoals,
      avgGoalsPerMatch: stats.totalMatches > 0 
        ? (stats.totalGoals / stats.totalMatches).toFixed(2) 
        : '0.00',
      over25: stats.over25,
      over25Pct: stats.totalMatches > 0 
        ? Math.round((stats.over25 / stats.totalMatches) * 100) 
        : 0,
      btts: stats.btts,
      bttsPct: stats.totalMatches > 0 
        ? Math.round((stats.btts / stats.totalMatches) * 100) 
        : 0,
      cleanSheets: stats.cleanSheets,
      cleanSheetsPct: stats.totalMatches > 0 
        ? Math.round((stats.cleanSheets / stats.totalMatches) * 100) 
        : 0,
      avgPossession: stats.possessionCount > 0 
        ? (stats.totalPossession / stats.possessionCount).toFixed(1) 
        : '0.0',
      avgShots: totalTeamGames > 0 
        ? (stats.totalShots / totalTeamGames).toFixed(1) 
        : '0.0',
      avgCorners: totalTeamGames > 0 
        ? (stats.totalCorners / totalTeamGames).toFixed(1) 
        : '0.0',
      avgYellowCards: totalTeamGames > 0 
        ? (stats.totalYellowCards / totalTeamGames).toFixed(1) 
        : '0.0'
    }
  })

  return {
    computedStandings,
    roundStatistics,
    overallStats
  }
}
