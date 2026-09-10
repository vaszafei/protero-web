import { getSupabase } from '~/server/utils/supabase'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // Operator-only surface: this runs on the service-role client, which bypasses RLS.
  await requireAdmin(event)

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
