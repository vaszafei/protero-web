/**
 * Elo Rating System
 * Updates team Elo ratings after each match result
 */

import { getSupabase } from './supabase'

const K_FACTOR = 30 // Responsive to recent form
const INITIAL_ELO = 1500
const HOME_ADVANTAGE = 100 // Elo points advantage for home team

export interface EloUpdate {
  homeTeamId: number
  awayTeamId: number
  homeGoals: number
  awayGoals: number
  homeEloBefore: number
  awayEloBefore: number
  homeEloAfter: number
  awayEloAfter: number
  homeEloChange: number
  awayEloChange: number
}

/**
 * Calculate expected score using Elo formula
 * Returns probability of winning (0-1)
 */
function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

/**
 * Get team's current Elo rating
 */
async function getTeamElo(teamId: number): Promise<number> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('teams')
    .select('elo')
    .eq('id', teamId)
    .single()
  
  if (error || !data) {
    return INITIAL_ELO
  }
  
  return Number(data.elo) || INITIAL_ELO
}

/**
 * Update team's Elo rating in database
 */
async function setTeamElo(teamId: number, newElo: number): Promise<void> {
  const supabase = getSupabase()
  await supabase
    .from('teams')
    .update({ elo: Math.round(newElo) })
    .eq('id', teamId)
}

/**
 * Update Elo ratings for both teams after a match
 * Call this whenever a match result is added/updated
 */
export async function updateEloRatings(
  homeTeamId: number,
  awayTeamId: number,
  homeGoals: number,
  awayGoals: number
): Promise<EloUpdate> {
  // Get current Elo ratings
  const homeElo = await getTeamElo(homeTeamId)
  const awayElo = await getTeamElo(awayTeamId)
  
  // Calculate expected scores (with home advantage)
  const homeExpected = calculateExpectedScore(homeElo + HOME_ADVANTAGE, awayElo)
  const awayExpected = 1 - homeExpected
  
  // Determine actual result scores
  let homeActual: number, awayActual: number
  
  if (homeGoals > awayGoals) {
    // Home win
    homeActual = 1
    awayActual = 0
  } else if (homeGoals < awayGoals) {
    // Away win
    homeActual = 0
    awayActual = 1
  } else {
    // Draw
    homeActual = 0.5
    awayActual = 0.5
  }
  
  // Calculate new Elo ratings using standard formula:
  // New Rating = Old Rating + K * (Actual - Expected)
  const homeEloChange = K_FACTOR * (homeActual - homeExpected)
  const awayEloChange = K_FACTOR * (awayActual - awayExpected)
  
  const newHomeElo = homeElo + homeEloChange
  const newAwayElo = awayElo + awayEloChange
  
  // Update database
  await setTeamElo(homeTeamId, newHomeElo)
  await setTeamElo(awayTeamId, newAwayElo)
  
  return {
    homeTeamId,
    awayTeamId,
    homeGoals,
    awayGoals,
    homeEloBefore: homeElo,
    awayEloBefore: awayElo,
    homeEloAfter: Math.round(newHomeElo),
    awayEloAfter: Math.round(newAwayElo),
    homeEloChange: Math.round(homeEloChange),
    awayEloChange: Math.round(awayEloChange)
  }
}

/**
 * Get Elo ratings for prediction
 * Returns current Elo for both teams
 */
export async function getEloForPrediction(homeTeamId: number, awayTeamId: number) {
  const [homeElo, awayElo] = await Promise.all([
    getTeamElo(homeTeamId),
    getTeamElo(awayTeamId)
  ])
  
  return { homeElo, awayElo }
}

/**
 * Predict match outcome using Elo ratings
 * Returns probabilities for home win, draw, away win
 */
export function predictByElo(homeElo: number, awayElo: number) {
  // Calculate expected probability with home advantage
  const homeWinProb = calculateExpectedScore(homeElo + HOME_ADVANTAGE, awayElo)
  const awayWinProb = calculateExpectedScore(awayElo, homeElo + HOME_ADVANTAGE)
  
  // Elo gives win probability, but we need to distribute draw probability
  // Empirically, about 25-30% of matches end in draws
  // We'll use a model where close Elo means more draws
  
  const eloDiff = Math.abs(homeElo - awayElo)
  
  // Draw probability decreases as Elo difference increases
  // Base draw prob: 0.27, reduces by 0.001 per Elo point difference
  const drawProb = Math.max(0.15, Math.min(0.35, 0.27 - (eloDiff * 0.0005)))
  
  // Adjust win probabilities to account for draws
  const remainingProb = 1 - drawProb
  const homeWin = homeWinProb * remainingProb
  const awayWin = awayWinProb * remainingProb
  
  return {
    homeWin: Number(homeWin.toFixed(4)),
    draw: Number(drawProb.toFixed(4)),
    awayWin: Number(awayWin.toFixed(4))
  }
}

/**
 * Get Elo difference and strength assessment
 */
export function getEloAnalysis(homeElo: number, awayElo: number) {
  const diff = homeElo - awayElo
  const diffWithHome = (homeElo + HOME_ADVANTAGE) - awayElo
  
  let assessment: string
  if (Math.abs(diffWithHome) < 50) {
    assessment = 'Even match'
  } else if (Math.abs(diffWithHome) < 100) {
    assessment = diffWithHome > 0 ? 'Slight home advantage' : 'Slight away advantage'
  } else if (Math.abs(diffWithHome) < 200) {
    assessment = diffWithHome > 0 ? 'Home favorites' : 'Away favorites'
  } else {
    assessment = diffWithHome > 0 ? 'Strong home favorites' : 'Strong away favorites'
  }
  
  return {
    homeElo,
    awayElo,
    difference: diff,
    differenceWithHome: diffWithHome,
    assessment,
    homeAdvantagePoints: HOME_ADVANTAGE
  }
}
