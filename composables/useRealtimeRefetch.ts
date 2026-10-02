import type { RealtimeChannel } from '@supabase/supabase-js'

export interface RealtimeSource {
  table: string
  /** PostgREST-style row filter, e.g. `wallet_id=eq.26`. */
  filter?: string
}

/**
 * Re-runs `onChange` when a published table changes (Supabase Realtime `postgres_changes`).
 *
 * An event is a NUDGE, never a data source: the page re-reads through its own function, so RLS and the
 * one verdict path still apply and a payload is never trusted. Events inside `debounceMs` coalesce into
 * one call — a settlement run writes hundreds of rows in seconds.
 *
 * It does not poll. If the channel cannot connect, `state` says `offline` and the owner sees that the
 * page is not live — a stale page that looks live is the failure this avoids. Pass a getter for
 * `sources` to follow a changing key (the wallet id): it resubscribes when the sources change.
 */
export function useRealtimeRefetch(
  name: string,
  sources: () => RealtimeSource[],
  onChange: () => void,
  debounceMs = 2000,
) {
  const supabase = useSupabaseClient()
  const state = ref<'connecting' | 'live' | 'offline'>('connecting')
  const reason = ref<string | null>(null)

  let channel: RealtimeChannel | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  const nudge = () => {
    if (disposed || timer) return
    timer = setTimeout(() => { timer = null; if (!disposed) onChange() }, debounceMs)
  }

  function close() {
    if (!channel) return
    const closing = channel
    channel = null
    supabase.removeChannel(closing)
  }

  function open() {
    close()
    const list = sources()
    if (!list.length) return
    state.value = 'connecting'
    reason.value = null
    let ch = supabase.channel(`${name}:${list.map(s => `${s.table}:${s.filter ?? '*'}`).join('|')}`)
    for (const s of list) {
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: s.table, ...(s.filter ? { filter: s.filter } : {}) }, nudge)
    }
    channel = ch.subscribe((status, err) => {
      if (disposed || channel !== ch) return
      if (status === 'SUBSCRIBED') {
        state.value = 'live'
        reason.value = null
        // Rows written between the page's first read and the subscription landed unseen.
        nudge()
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        state.value = 'offline'
        reason.value = err?.message || status
      }
    })
  }

  watch(() => JSON.stringify(sources()), open, { immediate: true })

  onBeforeUnmount(() => {
    disposed = true
    if (timer) clearTimeout(timer)
    close()
  })

  // reactive(), not a plain object: templates compare `live.state === 'live'`, and a ref nested in a plain
  // object is not unwrapped there (only the interpolation unwraps it, which hides the mismatch).
  return reactive({ state, reason })
}
