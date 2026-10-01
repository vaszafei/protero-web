/**
 * A player-props slate for one league and Athens date: its status, and "Load
 * props" (server/utils/props-slate.ts). Polls while a load runs.
 */
import { ref, computed, watch, onBeforeUnmount, type Ref } from 'vue'

const POLL_MS = 2500

export function athensToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Athens' })
}

export function usePropsSlate(league: Ref<string | null>, date: Ref<string>) {
  const apiFetch = useApiFetch()
  const status = ref<any>(null)
  const error = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | null = null

  const loading = computed(() => status.value?.job?.state === 'running')
  const message = (e: any, fallback: string) => e?.data?.statusMessage || e?.statusMessage || e?.message || fallback

  async function refresh() {
    try {
      status.value = await apiFetch('/api/props/slate/status', { query: { league: league.value, date: date.value } })
      error.value = null
    } catch (e: any) {
      error.value = message(e, 'status failed')
    }
    if (timer) clearTimeout(timer)
    if (loading.value) timer = setTimeout(refresh, POLL_MS)
  }

  async function load() {
    error.value = null
    try {
      await apiFetch('/api/props/slate/run', { method: 'POST', body: { league: league.value, date: date.value } })
    } catch (e: any) {
      error.value = message(e, 'load failed to start')
    }
    await refresh()
  }

  watch([league, date], () => { status.value = null; if (league.value) refresh() }, { immediate: true })
  onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

  return { status, error, loading, refresh, load }
}
