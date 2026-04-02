import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'Game ID is required'
    })
  }

  try {
    const supabase = getSupabase()

    // Delete associated data first (foreign key constraints)
    // Delete lineups
    await supabase.from('lineups').delete().eq('game_id', id)

    // Delete predictions
    await supabase.from('predictions').delete().eq('game_id', id)

    // Delete the game
    const { error: deleteError } = await supabase
      .from('games')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    return {
      success: true,
      message: 'Game deleted successfully'
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to delete game: ${error.message}`
    })
  }
})
