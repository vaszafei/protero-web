/**
 * POST /api/credits/tasks/contribute
 * Submit a data contribution for a task and earn credits.
 * Body: { task_id: number, data: object }
 */
import { getSupabase } from '~/server/utils/supabase'
import { getAuthenticatedUserId, awardCredits, getCreditsConfig } from '~/server/utils/credits'

export default defineEventHandler(async (event) => {
  const userId = await getAuthenticatedUserId(event)
  const { task_id, data } = await readBody(event)

  if (!task_id || !data || typeof data !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'task_id and data (object) are required' })
  }

  const supabase = getSupabase()

  // Check daily task limit
  const dailyLimit = await getCreditsConfig<number>('daily_task_limit')
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { count: todayCount } = await supabase
    .from('data_contributions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', todayStart.toISOString())

  if ((todayCount ?? 0) >= dailyLimit) {
    throw createError({
      statusCode: 429,
      statusMessage: `Daily limit reached (${dailyLimit} tasks per day). Come back tomorrow!`
    })
  }

  // Fetch the task
  const { data: task, error: taskErr } = await supabase
    .from('data_tasks')
    .select('*')
    .eq('id', task_id)
    .single()

  if (taskErr || !task) {
    throw createError({ statusCode: 404, statusMessage: 'Task not found' })
  }

  if (task.status !== 'open') {
    throw createError({ statusCode: 400, statusMessage: 'This task is no longer open' })
  }

  // Check if user already contributed
  const { data: existingContrib } = await supabase
    .from('data_contributions')
    .select('id')
    .eq('task_id', task_id)
    .eq('user_id', userId)
    .maybeSingle()

  if (existingContrib) {
    throw createError({ statusCode: 409, statusMessage: 'You have already submitted data for this task' })
  }

  // Check if task is full
  if (task.current_contributors >= task.max_contributors) {
    // Mark as filled
    await supabase
      .from('data_tasks')
      .update({ status: 'filled' })
      .eq('id', task_id)

    throw createError({ statusCode: 400, statusMessage: 'This task has reached its contributor limit' })
  }

  // Determine position and reward
  const position = task.current_contributors + 1
  const isFirst = position === 1

  // Get league info for multiplier
  const { data: leagueInfo } = await supabase
    .from('leagues')
    .select('credit_tier')
    .eq('key', task.league_key)
    .maybeSingle()

  const topMultiplier = await getCreditsConfig<number>('top_league_task_multiplier')
  const multiplier = leagueInfo?.credit_tier === 'top' ? topMultiplier : 1

  let reward = Math.round(task.base_reward * multiplier)
  if (isFirst) {
    reward += task.first_bonus
  }

  // Insert contribution
  const { error: contribErr } = await supabase
    .from('data_contributions')
    .insert({
      task_id,
      user_id: userId,
      data,
      is_first: isFirst,
      credits_awarded: reward,
      position
    })

  if (contribErr) {
    throw createError({ statusCode: 500, statusMessage: `Failed to save contribution: ${contribErr.message}` })
  }

  // Update task contributor count
  const newCount = task.current_contributors + 1
  const newStatus = newCount >= task.max_contributors ? 'filled' : 'open'

  await supabase
    .from('data_tasks')
    .update({
      current_contributors: newCount,
      status: newStatus
    })
    .eq('id', task_id)

  // Award credits
  const newBalance = await awardCredits(
    userId,
    reward,
    'data_contribution',
    `Data contribution for task #${task_id}${isFirst ? ' (first contributor bonus!)' : ''}`,
    String(task_id)
  )

  return {
    success: true,
    credits_awarded: reward,
    is_first: isFirst,
    position,
    new_balance: newBalance
  }
})
