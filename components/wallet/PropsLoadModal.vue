<template>
  <UModal
    :model-value="modelValue"
    :ui="{ width: 'sm:max-w-2xl', background: 'bg-surface' }"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="panel-elevated rounded-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
      <header class="panel-head">
        <h2 class="panel-title">Load props · {{ date }}</h2>
        <span class="ml-3 px-1.5 py-0.5 rounded text-[10px] font-semibold" :class="stateClass(jobState)">
          {{ jobLabel }}
        </span>
        <span v-if="job" class="ml-2 text-[11px] text-zinc-500 tabular-nums">{{ elapsed }}</span>
        <button class="btn btn-ghost ml-auto text-[11px]" title="The load keeps running" @click="$emit('update:modelValue', false)">Close</button>
      </header>

      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        <p v-if="!job" class="text-[11px] text-zinc-500">
          Starting — injuries, Stoiximan capture, the props board, then candidate legs at both tiers.
        </p>

        <div v-for="s in steps" :key="s.key" class="rounded-md border border-edge/60">
          <div class="flex items-center gap-2 px-3 py-2">
            <span class="w-14 text-center px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0" :class="stepClass(s.state)">{{ stepLabel(s.state) }}</span>
            <span class="text-xs" :class="s.state === 'pending' ? 'text-zinc-600' : 'text-zinc-200'">{{ s.label }}</span>
            <span v-if="s.key === 'capture' && s.listed" class="ml-auto text-[11px] text-zinc-500 tabular-nums">
              {{ s.events?.length || 0 }} / {{ s.listed }} events · {{ capturedGames(s) }} tonight · {{ capturedRows(s) }} lines
            </span>
          </div>

          <div v-if="s.key === 'capture' && s.listed" class="px-3 pb-2">
            <div class="h-1 rounded bg-zinc-800 overflow-hidden">
              <div class="h-full bg-blue-500/70 transition-all" :style="{ width: `${Math.round(100 * (s.events?.length || 0) / s.listed)}%` }" />
            </div>
            <ul v-if="capturedEvents(s).length" class="mt-2 space-y-0.5">
              <li v-for="e in capturedEvents(s)" :key="e.event" class="flex items-center gap-2 text-[11px]">
                <span class="text-zinc-300">{{ e.event }}</span>
                <span class="ml-auto tabular-nums" :class="e.state === 'failed' ? 'text-amber-300' : 'text-zinc-500'">
                  {{ e.state === 'captured' ? `${e.players} players · ${e.rows} lines` : e.note }}
                </span>
              </li>
            </ul>
            <p v-if="skipped(s)" class="mt-1 text-[10px] text-zinc-600">{{ skipped(s) }} events on other dates skipped</p>
          </div>

          <pre
            v-if="s.key !== 'capture' && s.detail.length && s.state !== 'pending'"
            class="mx-3 mb-2 max-h-40 overflow-auto rounded bg-black/30 border border-edge/40 p-2 text-[10px] leading-relaxed whitespace-pre-wrap text-zinc-400"
          >{{ s.detail.join('\n') }}</pre>
        </div>
      </div>

      <footer class="flex items-center gap-2 px-4 py-2 border-t border-edge/40">
        <p v-if="error" class="text-[11px] text-red-300">{{ error }}</p>
        <p v-else-if="jobState === 'failed'" class="text-[11px] text-red-300">
          Stopped at the red step — its output is above. The board shows whatever finished before it.
        </p>
        <button
          class="btn btn-brand ml-auto"
          :disabled="jobState === 'running'"
          @click="$emit('update:modelValue', false)"
        >{{ jobState === 'running' ? 'Loading…' : 'View slate' }}</button>
      </footer>
    </div>
  </UModal>
</template>

<script setup lang="ts">
/**
 * Progress of one "Load props" job. The server reads the job's log back as steps
 * (server/utils/props-slate.ts::progressOf); this only draws them, so it knows nothing
 * a script did not print. Closing it leaves the job running — the page keeps polling.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{ modelValue: boolean, date: string, status: any, error: string | null }>()
defineEmits<{ 'update:modelValue': [boolean] }>()

const now = ref(Date.now())
const tick = setInterval(() => { now.value = Date.now() }, 1000)
onBeforeUnmount(() => clearInterval(tick))

// Until the POST lands, `status.job` is still the previous, finished load — hide it.
const openedAt = ref(Date.now())
watch(() => props.modelValue, (open) => { if (open) openedAt.value = Date.now() })
const job = computed(() => {
  const j = props.status?.job
  return j && (j.state === 'running' || j.startedAt >= openedAt.value - 10_000) ? j : null
})
const steps = computed<any[]>(() => job.value?.steps || [])
const jobState = computed(() => job.value?.state || 'running')
const jobLabel = computed(() => ({ running: 'RUNNING', ok: 'DONE', failed: 'FAILED' } as Record<string, string>)[jobState.value])
const elapsed = computed(() => {
  if (!job.value) return ''
  const s = Math.round(((job.value.finishedAt || now.value) - job.value.startedAt) / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
})

const capturedEvents = (s: any) => (s.events || []).filter((e: any) => e.state !== 'skipped')
const capturedGames = (s: any) => (s.events || []).filter((e: any) => e.state === 'captured').length
const capturedRows = (s: any) => (s.events || []).reduce((n: number, e: any) => n + (e.rows || 0), 0)
const skipped = (s: any) => (s.events || []).filter((e: any) => e.state === 'skipped').length

const stateClass = (st: string) => ({
  running: 'bg-blue-500/15 text-blue-300',
  ok: 'bg-emerald-500/15 text-emerald-300',
  failed: 'bg-red-500/15 text-red-300',
} as Record<string, string>)[st] || 'bg-zinc-700/30 text-zinc-400'
const stepLabel = (st: string) => ({ running: 'running', done: 'done', failed: 'failed' } as Record<string, string>)[st] || 'waiting'
const stepClass = (st: string) => ({
  running: 'bg-blue-500/15 text-blue-300 animate-pulse',
  done: 'bg-emerald-500/10 text-emerald-300',
  failed: 'bg-red-500/15 text-red-300',
} as Record<string, string>)[st] || 'bg-zinc-800 text-zinc-600'
</script>
