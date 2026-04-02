/**
 * GET /api/credits/tasks
 * Returns open data tasks available for the authenticated user.
 * Excludes tasks the user has already contributed to.
 */
import { getSupabase } from '~/server/utils/supabase'
import { getAuthenticatedUserId } from '~/server/utils/credits'

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)
  const supabase = getSupabase()

  // Get IDs of tasks this user already contributed to
  const { data: userContribs } = await supabase
    .from('data_contributions')
    .select('task_id')
    .eq('user_id', userId)

  const contributedTaskIds = (userContribs || []).map(c => c.task_id)

  // Fetch open tasks with game info
  let query = supabase
    .from('data_tasks')
    .select(`
      id, game_id, task_type, sport, league_key, status,
      max_contributors, current_contributors, base_reward, first_bonus,
      expires_at, created_at
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(50)

  if (contributedTaskIds.length > 0) {
    // Supabase doesn't have a NOT IN filter directly — we filter client-side
  }

  const { data: tasks, error } = await query

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  // Filter out already-contributed tasks and enrich with game data
  const availableTasks = (tasks || []).filter(t => !contributedTaskIds.includes(t.id))

  // Fetch game details for these tasks
  const gameIds = [...new Set(availableTasks.map(t => t.game_id))]
  let games: any[] = []

  if (gameIds.length > 0) {
    const { data: gamesData } = await supabase
      .from('games')
      .select('id, home_team, away_team, date, status, league_key')
      .in('id', gameIds)

    games = gamesData || []
  }

  const gameMap = new Map(games.map(g => [g.id, g]))

  const enrichedTasks = availableTasks.map(task => ({
    ...task,
    game: gameMap.get(task.game_id) || null,
    is_first: task.current_contributors === 0
  }))

  return { tasks: enrichedTasks }
})
