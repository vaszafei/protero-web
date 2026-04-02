import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const supabase = getSupabase()

  try {
    // Delete all expired sessions
    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (deleteError) {
      console.error('Error cleaning up sessions:', deleteError)
    }

    return {
      success: true,
      message: 'Old sessions cleaned up'
    }
  } catch (error: any) {
    console.error('Session cleanup error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to cleanup sessions'
    })
  }
})
