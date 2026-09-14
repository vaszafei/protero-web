<template>
  <UModal
    :model-value="isOpen"
    @update:model-value="$emit('close')"
    :ui="{ width: 'sm:max-w-2xl', background: 'bg-surface' }"
  >
    <div class="panel-elevated rounded-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <header class="panel-head">
        <h2 class="panel-title">Run pipeline</h2>
        <button class="btn btn-ghost btn-icon ml-auto" title="Close" @click="$emit('close')">
          <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
        </button>
      </header>

      <!-- Pipeline chooser -->
      <div class="px-4 py-3 border-b border-edge/40">
        <div class="flex items-center gap-2">
          <button
            v-for="p in pipelines"
            :key="p"
            class="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors capitalize"
            :class="selected === p ? 'bg-blue-500/15 text-blue-200 border border-blue-500/30' : 'bg-surface-light text-zinc-400 border border-edge hover:text-zinc-200'"
            @click="selectPipeline(p)"
          >
            {{ p }}
          </button>
        </div>
        <label class="mt-3 flex items-center gap-2 text-[11px] text-zinc-500 cursor-pointer select-none">
          <input v-model="dryRun" type="checkbox" class="accent-blue-500" :disabled="busy" />
          Dry run — no writes (slates, odds, settlement, bets)
        </label>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-4 py-3">
        <!-- Action row -->
        <div class="flex items-center gap-3 mb-3">
          <button class="btn btn-brand" :disabled="busy" @click="startRun">
            <UIcon
              :name="busy ? 'i-heroicons-arrow-path' : 'i-heroicons-play'"
              class="w-3.5 h-3.5"
              :class="busy ? 'animate-spin' : ''"
            />
            {{ busy ? 'Running…' : run ? 'Run again' : `Run ${selected}` }}
          </button>
          <span v-if="run" class="text-[10px] text-zinc-600 tabular-nums">
            last run {{ fmtWhen(run.started_at) }}
          </span>
          <span
            v-if="run?.active"
            class="text-[10px] tabular-nums ml-auto"
            :class="live ? 'text-emerald-400/70' : 'text-zinc-600'"
            :title="live
              ? 'Subscribed to phase_runs — phases land as the runner writes them.'
              : 'Realtime did not connect; falling back to a 2s poll.'"
          >
            {{ live ? 'live' : 'polling' }}
          </span>
        </div>

        <!-- Summary -->
        <div v-if="run" class="panel p-3 mb-3">
          <div class="flex items-center gap-2">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold" :class="runStatusClass">
              {{ run.active ? 'RUNNING' : (run.status || '?').toUpperCase() }}
            </span>
            <span class="text-[11px] text-zinc-500 tabular-nums">
              <template v-if="run.elapsed_s != null">{{ run.elapsed_s }}s</template>
              <span v-if="run.errors" class="text-red-400"> · {{ run.errors }} error{{ run.errors === 1 ? '' : 's' }}</span>
              <span v-if="run.warnings" class="text-amber-400/70"> · {{ run.warnings }} warning{{ run.warnings === 1 ? '' : 's' }}</span>
            </span>
          </div>
        </div>

        <!-- Phases -->
        <div v-if="phases.length" class="rounded-lg border border-edge overflow-hidden">
          <table class="w-full text-xs">
            <thead>
              <tr class="bg-surface-light/40 text-zinc-500">
                <th class="text-left font-medium px-3 py-2">Phase</th>
                <th class="text-right font-medium px-3 py-2 w-16">Status</th>
                <th class="text-right font-medium px-3 py-2 w-16">Time</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ph in phases" :key="ph.phase_name + ph.started_at" class="border-t border-edge/40">
                <td class="px-3 py-1.5">
                  <span class="text-zinc-300">{{ ph.phase_name }}</span>
                  <p v-if="ph.gate_failed || ph.error_msg" class="text-[10px] text-amber-300/80 mt-0.5 leading-snug">
                    {{ ph.gate_failed ? `gated: ${ph.gate_failed}` : '' }}{{ ph.error_msg ? (ph.gate_failed ? ' — ' : '') + truncate(ph.error_msg) : '' }}
                  </p>
                  <button
                    v-if="hasOutput(ph)"
                    class="block mt-1 text-[10px] text-blue-300/80 hover:text-blue-200"
                    @click="togglePhase(ph)"
                  >
                    {{ expanded.has(phaseKey(ph)) ? 'Hide output' : 'Show output' }}
                  </button>
                  <pre
                    v-if="expanded.has(phaseKey(ph))"
                    class="mt-1 max-h-56 overflow-auto rounded bg-black/30 border border-edge/40 p-2 text-[10px] leading-relaxed whitespace-pre-wrap text-zinc-400"
                  >{{ phaseOutput(ph) }}</pre>
                </td>
                <td class="px-3 py-1.5 text-right">
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold" :class="phaseStatusClass(ph.status)">
                    {{ ph.status }}
                  </span>
                </td>
                <td class="px-3 py-1.5 text-right tabular-nums text-zinc-500">{{ ph.elapsed_s != null ? ph.elapsed_s + 's' : '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-else-if="run && !phases.length" class="text-[11px] text-zinc-600 leading-relaxed">
          <template v-if="run.active">Phases appear as they land — the runner persists each one to <code class="text-zinc-500">phase_runs</code> as it completes.</template>
          <template v-else>This run wrote no phase telemetry (a bash-pipeline run writes only the summary row).</template>
        </p>

        <p v-if="!run" class="text-[11px] text-zinc-600 leading-relaxed">
          Runs the Python DAG runner — the same phases as the scheduled pipeline, with one
          <code class="text-zinc-500">phase_runs</code> row per step. The bash pipeline is still the
          scheduled production path; this is the on-demand trigger.
        </p>
      </div>

      <p v-if="error" class="px-4 py-2 border-t border-red-500/25 bg-red-500/5 text-[11px] text-red-300">
        {{ error }}
      </p>
    </div>
  </UModal>
</template>

<script setup lang="ts">
/**
 * The on-demand pipeline trigger and its live readout.
 *
 * Telemetry arrives over Realtime (`pipeline_runs` + `phase_runs` were added to
 * the `supabase_realtime` publication in 20260903120000) and the modal re-reads
 * `/api/pipeline/runs` on every event, rather than trusting the payload: both
 * tables are admin-RLS'd, so an event is a NUDGE, not a data source.
 *
 * The poll is deliberately kept, at two cadences. A subscription can fail two
 * ways — it can never reach SUBSCRIBED (socket down), and it can reach
 * SUBSCRIBED and deliver nothing (Realtime evaluates our custom-JWT RLS policy
 * per subscriber). The first is caught by the status callback; only a heartbeat
 * catches the second, so a live channel still polls slowly.
 */
import { ref, computed, watch, onUnmounted } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'

const props = defineProps<{ isOpen: boolean }>()
defineEmits<{ close: [] }>()

const pipelines = ['football', 'basketball'] as const
const selected = ref<'football' | 'basketball'>('football')
const dryRun = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const run = ref<any>(null)
const phases = ref<any[]>([])
const expanded = ref<Set<string>>(new Set())
const live = ref(false)

/** Realtime is authoritative when it connects; the poll is the safety net. */
const POLL_MS_FALLBACK = 2000
const POLL_MS_HEARTBEAT = 15000

let pollTimer: ReturnType<typeof setInterval> | null = null
let pollMs = 0
let coalesceTimer: ReturnType<typeof setTimeout> | null = null
let channel: RealtimeChannel | null = null
let disposed = false

function selectPipeline(p: 'football' | 'basketball') {
  if (busy.value) return
  selected.value = p
  run.value = null
  phases.value = []
  expanded.value = new Set()
  error.value = null
  // Refresh the readout for the newly selected pipeline.
  fetchRun()
}

async function fetchRun() {
  try {
    const data = await $fetch(`/api/pipeline/runs?pipeline=${selected.value}`)
    run.value = data.run ? { ...data.run, active: data.active } : null
    phases.value = data.phases || []
  } catch (e: any) {
    // A failed poll must not nuke the modal — keep the last state.
  }
}

async function startRun() {
  busy.value = true
  error.value = null
  try {
    await $fetch('/api/pipeline/run', {
      method: 'POST',
      body: { pipeline: selected.value, dry_run: dryRun.value },
    })
    await fetchRun()
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to start pipeline'
  } finally {
    busy.value = false
  }
}

/**
 * Several phases can land in the same tick; one re-read serves all of them.
 */
function nudge() {
  if (disposed || coalesceTimer) return
  coalesceTimer = setTimeout(() => {
    coalesceTimer = null
    fetchRun()
  }, 250)
}

function subscribe() {
  if (channel) return
  const supabase = useSupabaseClient()
  channel = supabase
    .channel('pipeline-telemetry')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'phase_runs' }, nudge)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pipeline_runs' }, nudge)
    .subscribe((status) => {
      live.value = status === 'SUBSCRIBED'
      startPolling(live.value ? POLL_MS_HEARTBEAT : POLL_MS_FALLBACK)
    })
}

function unsubscribe() {
  if (!channel) return
  const supabase = useSupabaseClient()
  supabase.removeChannel(channel)
  channel = null
  live.value = false
}

function startPolling(intervalMs: number) {
  if (pollTimer && pollMs === intervalMs) return
  stopPolling()
  pollMs = intervalMs
  pollTimer = setInterval(fetchRun, intervalMs)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  pollMs = 0
}

/**
 * Nothing runs while the modal is shut. Opening it also fetches once — the
 * modal used to render its "no run yet" explainer over a pipeline that had run
 * an hour ago, because the first read only happened on a tab switch or a run.
 */
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      fetchRun()
      startPolling(POLL_MS_FALLBACK)
      subscribe()
    } else {
      unsubscribe()
      stopPolling()
    }
  },
  { immediate: true },
)

function truncate(s: string, n = 120): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

function hasOutput(ph: any): boolean {
  return !!(ph?.stdout_tail || ph?.stderr_tail)
}

function phaseKey(ph: any): string {
  return `${ph.phase_name}::${ph.started_at}`
}

function togglePhase(ph: any) {
  const key = phaseKey(ph)
  const next = new Set(expanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}

function phaseOutput(ph: any): string {
  const out = ph?.stdout_tail?.trim()
  const err = ph?.stderr_tail?.trim()
  if (out && err) return `── stdout ──\n${out}\n\n── stderr ──\n${err}`
  return (out || err || '')
}

function fmtWhen(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const ageMs = Date.now() - d.getTime()
  const h = Math.floor(ageMs / 3600_000)
  if (h > 0) return `${h}h ago`
  const m = Math.floor(ageMs / 60_000)
  if (m > 0) return `${m}m ago`
  return `${Math.max(0, Math.floor(ageMs / 1000))}s ago`
}

const runStatusClass = computed(() => {
  if (run.value?.active) return 'bg-blue-500/15 text-blue-300'
  return {
    ok: 'bg-emerald-500/15 text-emerald-300',
    success: 'bg-emerald-500/15 text-emerald-300',
    warnings: 'bg-amber-500/15 text-amber-300',
    errors: 'bg-red-500/15 text-red-300',
    failed: 'bg-red-500/15 text-red-300',
  }[run.value?.status] || 'bg-zinc-700/40 text-zinc-400'
})

function phaseStatusClass(status: string): string {
  return {
    ok: 'bg-emerald-500/15 text-emerald-300',
    failed: 'bg-red-500/15 text-red-300',
    gated: 'bg-zinc-700/40 text-zinc-400',
    skipped: 'bg-zinc-800/60 text-zinc-600',
    running: 'bg-blue-500/15 text-blue-300',
    pending: 'bg-zinc-800/60 text-zinc-600',
  }[status] || 'bg-zinc-800/60 text-zinc-400'
}

onUnmounted(() => {
  disposed = true
  if (coalesceTimer) clearTimeout(coalesceTimer)
  unsubscribe()
  stopPolling()
})
</script>
