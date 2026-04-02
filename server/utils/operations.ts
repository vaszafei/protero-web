import { getSupabase } from '~/server/utils/supabase'

export async function logOperation(
  operation: string,
  status: 'started' | 'success' | 'error',
  details: {
    affectedCount?: number
    errorMessage?: string
    userId?: number
    startedAt?: string
    durationMs?: number
  } = {}
) {
  const supabase = getSupabase()
  
  if (status === 'started') {
    const { data, error } = await supabase
      .from('operation_logs')
      .insert({
        operation,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select('id')
      .single()
    
    if (error) throw error
    return data.id
  } else {
    const { affectedCount = 0, errorMessage, durationMs } = details
    await supabase
      .from('operation_logs')
      .update({
        status,
        affected_count: affectedCount,
        error_message: errorMessage || null,
        completed_at: new Date().toISOString(),
        duration_ms: durationMs || null
      })
      .eq('operation', operation)
      .eq('status', 'running')
      .order('started_at', { ascending: false })
      .limit(1)
  }
}

export async function getRecentOperations(limit = 20) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('operation_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data
}
