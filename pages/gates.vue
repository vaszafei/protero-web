<template>
  <div class="p-3 sm:p-6 max-w-[1200px] mx-auto">
    <div class="mb-4">
      <h1 class="text-xl sm:text-2xl font-bold text-white">Gates</h1>
      <p class="text-zinc-500 text-xs sm:text-sm mt-0.5">
        Pipeline health from <code class="text-zinc-600">pipeline_runs</code>, and the
        regression suite (<code class="text-zinc-600">bash scripts/gates.sh</code>) recorded in
        <code class="text-zinc-600">gate_runs</code> every 6h. Nothing here is invented — a gate
        with no recorded run renders as <span class="text-zinc-400">not recorded</span>.
      </p>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-zinc-600" />
    </div>

    <template v-else>
      <!-- Pipeline health -->
      <h2 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 mt-6">
        Pipelines · last run per pipeline
      </h2>
      <div v-if="pipelines.length === 0" class="rounded-xl border border-edge bg-surface p-4 text-sm text-zinc-500">
        No pipeline runs recorded.
      </div>
      <div v-else class="grid sm:grid-cols-2 gap-3">
        <div
          v-for="p in pipelines"
          :key="p.pipeline"
          class="rounded-xl border border-edge bg-surface p-4"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-bold text-zinc-100 capitalize">{{ p.pipeline }}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold" :class="statusClass(p.status)">
              {{ p.status }}
            </span>
          </div>
          <div class="text-[11px] text-zinc-500 tabular-nums space-y-1">
            <div class="flex gap-3">
              <span>errors <span class="text-zinc-300">{{ p.errors }}</span></span>
              <span>warnings <span class="text-zinc-300">{{ p.warnings }}</span></span>
            </div>
            <div>
              last run
              <span class="text-zinc-400">{{ formatWhen(p.started_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Regression gates -->
      <div class="flex items-baseline justify-between mt-8 mb-2">
        <h2 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Regression gates · bash scripts/gates.sh
        </h2>
        <span v-if="gateRun" class="text-[10px] text-zinc-600">
          last run <span class="text-zinc-400">{{ formatWhen(gateRun.started_at) }}</span>
        </span>
      </div>

      <div v-if="gateRun" class="rounded-xl border border-edge bg-surface p-3 mb-3 flex items-center gap-3">
        <span class="px-2 py-1 rounded text-[11px] font-semibold" :class="gateRun.status === 'green' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'">
          {{ gateRun.status === 'green' ? 'GREEN' : 'RED' }}
        </span>
        <span class="text-xs text-zinc-500 tabular-nums">
          {{ gateRun.passed }} passed · {{ gateRun.failed }} failed
        </span>
      </div>

      <div class="rounded-xl border border-edge overflow-hidden">
        <table class="w-full text-xs">
          <thead>
            <tr class="bg-surface-light/40 text-zinc-500">
              <th class="text-left font-medium px-3 py-2">Gate</th>
              <th class="text-left font-medium px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in cliGates" :key="g.key" class="border-t border-edge/40">
              <td class="px-3 py-2 text-zinc-200 font-medium">{{ g.label }}</td>
              <td class="px-3 py-2">
                <span
                  v-if="g.recorded"
                  class="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                  :class="g.status === 'ok' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'"
                >
                  {{ g.status === 'ok' ? 'ok' : 'failed' }}
                </span>
                <template v-else>
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-800/60 text-zinc-500">
                    not recorded
                  </span>
                  <span class="ml-2 text-[10px] text-zinc-600">{{ g.reason }}</span>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="text-[10px] text-zinc-600 leading-relaxed mt-4">
        Run by <code>protero-gates.timer</code> every 6h via
        <code>common.gate_recorder</code>, which shells out to the same
        <code class="text-zinc-500">bash scripts/gates.sh</code> a human runs and persists the
        verdict to <code>gate_runs</code>. The gates themselves write nothing — only the
        recorder's one-row summary touches the database.
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const loading = ref(true)
const pipelines = ref<any[]>([])
const cliGates = ref<any[]>([])
const gateRun = ref<any | null>(null)

function statusClass(status: string): string {
  return {
    ok: 'bg-emerald-500/15 text-emerald-300',
    warnings: 'bg-amber-500/15 text-amber-300',
    errors: 'bg-red-500/15 text-red-300',
    running: 'bg-blue-500/15 text-blue-300',
  }[status] || 'bg-zinc-800/60 text-zinc-400'
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const ageMs = Date.now() - d.getTime()
  const h = Math.floor(ageMs / 3600_000)
  const days = Math.floor(h / 24)
  if (days > 0) return `${days}d ago`
  if (h > 0) return `${h}h ago`
  return `${Math.max(0, Math.floor(ageMs / 60_000))}m ago`
}

onMounted(async () => {
  try {
    const data = await $fetch('/api/gates')
    pipelines.value = data.pipelines || []
    cliGates.value = data.cli_gates || []
    gateRun.value = data.gate_run || null
  } catch (e) {
    console.error('Failed to load gates:', e)
  } finally {
    loading.value = false
  }
})

useHead({ title: 'Gates · Protero' })
</script>
