import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const gameId = parseInt(getRouterParam(event, 'id') || '0')
  if (!gameId) throw createError({ statusCode: 400, message: 'Game ID required' })

  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('player_prop_picks')
    .select('*')
    .eq('game_id', gameId)
    .order('trad_tier', { ascending: true })
    .order('confidence', { ascending: false })

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { picks: data || [] }
})
