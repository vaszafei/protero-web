<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="panel-elevated rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <header class="panel-head">
        <h2 class="panel-title">Run pipeline</h2>
        <button @click="close" class="panel-link ml-auto hover:text-zinc-100 text-zinc-400 text-sm leading-none">Close</button>
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
          <button
            class="refresh-btn"
            :disabled="busy"
            @click="startRun"
          >
            <span class="refresh-icon" :class="busy ? 'animate-spin' : ''">▶</span>
            {{ busy ? 'Running…' : run ? 'Run again' : `Run ${selected}` }}
          </button>
          <span v-if="run" class="text-[10px] text-zinc-600 tabular-nums">
            last run {{ fmtWhen(run.started_at) }}
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

const props = defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ close: [] }>()

const pipelines = ['football', 'basketball'] as const
const selected = ref<'football' | 'basketball'>('football')
const dryRun = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const run = ref<any>(null)
const phases = ref<any[]>([])
const expanded = ref<Set<string>>(new Set())

let pollTimer: ReturnType<typeof setInterval> | null = null
let disposed = false

function close() {
  stopPolling()
  emit('close')
}

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
    startPolling()
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to start pipeline'
  } finally {
    busy.value = false
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    if (disposed) return
    await fetchRun()
    // Stop once the run has resolved to a terminal status and is no longer active.
    if (run.value && !run.value.active && run.value.status !== 'running') {
      stopPolling()
    }
  }, 2000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

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
  stopPolling()
})
</script>

<style scoped>
.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: 0.4rem;
  font-size: 0.72rem;
  font-weight: 600;
  background: linear-gradient(165deg, rgba(41, 45, 54, 0.6), rgba(28, 31, 39, 0.9));
  border: 1px solid #2a2f3a;
  color: rgb(161, 161, 170);
  transition: color 160ms ease, border-color 160ms ease, transform 140ms ease;
}
.refresh-btn:hover:not(:disabled) { color: rgb(228, 231, 236); border-color: rgba(57, 135, 229, 0.4); }
.refresh-btn:active:not(:disabled) { transform: scale(0.97); }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.refresh-icon { display: inline-block; font-size: 0.85rem; line-height: 1; }
</style>
