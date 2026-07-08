import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, 'session_id')

  if (sessionId) {
    const supabase = getSupabase()
    
    try {
      // Delete session from database
      await supabase
        .from('sessions')
        .delete()
        .eq('token', sessionId)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Clear session cookie
  deleteCookie(event, 'session_id')

  return { success: true }
})
