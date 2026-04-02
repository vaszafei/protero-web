import { getSupabase } from '~/server/utils/supabase'
import { getCached, setCache } from '~/server/utils/cache'

export default defineEventHandler(async (event) => {
  const { league } = getQuery(event)
  
  const cacheKey = `accuracy:${league || 'all'}`
  const cached = getCached<any>(cacheKey)
  if (cached) return cached

  const supabase = getSupabase()
  
  try {
    // Build base query for predictions
    let validatedQuery = supabase
      .from('predictions')
      .select('*, games!inner(league_key, round, home_team_id, away_team_id)')
      .not('validated_at', 'is', null)
    
    if (league) {
      validatedQuery = validatedQuery.eq('games.league_key', league)
    }
    
    const { data: validatedPredictions, error: validatedError } = await validatedQuery
    
    if (validatedError) throw validatedError
    
    // Calculate overall stats
    const totalValidated = validatedPredictions?.length || 0
    const resultCorrect = validatedPredictions?.filter(p => p.result_correct).length || 0
    const goalsCorrect = validatedPredictions?.filter(p => p.goals_correct).length || 0
    const over25Correct = validatedPredictions?.filter(p => p.over25_correct).length || 0
    const bttsCorrect = validatedPredictions?.filter(p => p.btts_correct).length || 0
    
    const resultAccuracy = totalValidated > 0 ? (resultCorrect / totalValidated) * 100 : 0
    const goalsAccuracy = totalValidated > 0 ? (goalsCorrect / totalValidated) * 100 : 0
    const over25Accuracy = totalValidated > 0 ? (over25Correct / totalValidated) * 100 : 0
    const bttsAccuracy = totalValidated > 0 ? (bttsCorrect / totalValidated) * 100 : 0
    
    // Calculate accuracy by confidence ranges
    const confidenceRanges = [
      { min: 90, max: 100, label: '90-100' },
      { min: 80, max: 89, label: '80-89' },
      { min: 70, max: 79, label: '70-79' },
      { min: 60, max: 69, label: '60-69' },
      { min: 50, max: 59, label: '50-59' }
    ]
    
    const byConfidence = confidenceRanges.map(range => {
      const predictions = validatedPredictions?.filter(p => 
        p.confidence >= range.min && p.confidence <= range.max
      ) || []
      const total = predictions.length
      const correct = predictions.filter(p => p.result_correct).length
      const accuracy = total > 0 ? (correct / total) * 100 : 0
      
      return {
        range: range.label,
        total,
        correct,
        accuracy: accuracy.toFixed(1)
      }
    })
    
    // Get recent predictions (limit 20)
    let recentQuery = supabase
      .from('predictions')
      .select(`
        prediction,
        actual_result,
        result_correct,
        goals_correct,
        confidence,
        validated_at,
        games!inner(
          round,
          league_key,
          home_teams:teams!games_home_team_id_fkey(name),
          away_teams:teams!games_away_team_id_fkey(name)
        )
      `)
      .not('validated_at', 'is', null)
      .order('validated_at', { ascending: false })
      .limit(20)
    
    if (league) {
      recentQuery = recentQuery.eq('games.league_key', league)
    }
    
    const { data: recentPredictions } = await recentQuery
    
    // Get pending validations count
    let pendingQuery = supabase
      .from('predictions')
      .select('*, games!inner(status, home_goals)', { count: 'exact', head: true })
      .eq('games.status', 'completed')
      .not('games.home_goals', 'is', null)
      .is('validated_at', null)
    
    if (league) {
      pendingQuery = pendingQuery.eq('games.league_key', league)
    }
    
    const { count: pendingCount } = await pendingQuery
    
    const result = {
      success: true,
      league: league || 'all',
      stats: {
        totalValidated,
        resultAccuracy: resultAccuracy.toFixed(1),
        goalsAccuracy: goalsAccuracy.toFixed(1),
        over25Accuracy: over25Accuracy.toFixed(1),
        bttsAccuracy: bttsAccuracy.toFixed(1),
        counts: {
          resultCorrect,
          goalsCorrect,
          over25Correct,
          bttsCorrect
        }
      },
      byConfidence,
      pendingValidation: pendingCount || 0,
      recentPredictions: (recentPredictions || []).map(p => ({
        game: `${p.games.home_teams?.name || 'Unknown'} vs ${p.games.away_teams?.name || 'Unknown'}`,
        round: p.games.round,
        league: p.games.league_key,
        predicted: p.prediction,
        actual: p.actual_result,
        confidence: p.confidence,
        resultCorrect: p.result_correct,
        goalsCorrect: p.goals_correct,
        validatedAt: p.validated_at
      })),
      timestamp: new Date().toISOString()
    }

    // Cache for 5 minutes — accuracy stats change infrequently
    setCache(cacheKey, result, 300)
    return result
    
  } catch (error: any) {
    console.error('Prediction accuracy error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to get accuracy stats: ' + error.message
    })
  }
})
