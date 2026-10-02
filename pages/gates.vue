<template>
  <UiPageShell title="Gates" subtitle="Pipeline health from pipeline_runs, and the regression suite recorded in gate_runs every 6h.">
    <Transition name="swap" mode="out-in">
      <div v-if="loading" class="grid-12 gates-grid">
        <div class="col-4"><UiSkeletonPanel :rows="4" height="100%" /></div>
        <div class="col-8"><UiSkeletonPanel :rows="12" height="100%" /></div>
      </div>

      <UiErrorState v-else-if="error" title="Gates failed to load." :error="error" @retry="load" />

      <div v-else class="grid-12 gates-grid">
        <!-- Pipeline health -->
        <section class="col-4 panel panel-fill">
          <header class="panel-head">
            <h2 class="panel-title">Pipelines</h2>
            <span class="text-[10px] text-zinc-600">last run per pipeline</span>
          </header>
          <div class="panel-scroll">
            <p v-if="pipelines.length === 0" class="px-3 py-3 text-[11px] text-zinc-500">No pipeline runs recorded.</p>
            <div v-for="p in pipelines" :key="p.pipeline" class="px-3 py-2 border-b border-edge/40 last:border-b-0">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-zinc-100 capitalize">{{ p.pipeline }}</span>
                <span class="pill" :class="statusClass(p.status)">{{ p.status }}</span>
              </div>
              <p class="text-[11px] text-zinc-500 tabular-nums mt-1">
                errors <span class="text-zinc-300">{{ p.errors }}</span>
                · warnings <span class="text-zinc-300">{{ p.warnings }}</span>
                · last run <span class="text-zinc-400">{{ formatWhen(p.started_at) }}</span>
              </p>
            </div>
          </div>
        </section>

        <!-- Regression gates -->
        <section class="col-8 panel panel-fill">
          <header class="panel-head !items-center">
            <h2 class="panel-title">Regression gates</h2>
            <span class="text-[10px] text-zinc-600">bash scripts/gates.sh</span>
            <template v-if="gateRun">
              <span class="pill" :class="gateRun.status === 'green' ? 'pill-blue' : 'pill-red'">
                {{ gateRun.status === 'green' ? 'GREEN' : 'RED' }}
              </span>
              <span class="text-[10px] text-zinc-500 tabular-nums">{{ gateRun.passed }} passed · {{ gateRun.failed }} failed</span>
              <span class="text-[10px] text-zinc-600">last run <span class="text-zinc-400">{{ formatWhen(gateRun.started_at) }}</span></span>
            </template>
            <UiTooltip class="ml-auto" :width="360" placement="bottom">
              <span class="panel-link">how to read</span>
              <template #content>
                <p>
                  Nothing here is invented — a gate with no recorded run renders as "not recorded". Run by
                  <code>protero-gates.timer</code> every 6h via <code>common.gate_recorder</code>, which shells out to
                  the same <code>bash scripts/gates.sh</code> a human runs and persists the verdict to
                  <code>gate_runs</code>. The gates themselves write nothing — only the recorder's one-row summary
                  touches the database.
                </p>
              </template>
            </UiTooltip>
          </header>
          <div class="panel-scroll">
            <table class="w-full text-xs">
              <thead class="sticky top-0 z-[1] bg-surface">
                <tr class="text-zinc-500">
                  <th class="text-left font-medium px-3 py-1.5">Gate</th>
                  <th class="text-left font-medium px-3 py-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(g, i) in cliGates" :key="g.key" class="border-t border-edge/40 row-in" :style="rowDelay(i)">
                  <td class="px-3 py-1.5 text-zinc-200 font-medium">{{ g.label }}</td>
                  <td class="px-3 py-1.5">
                    <span v-if="g.recorded" class="pill" :class="g.status === 'ok' ? 'pill-blue' : 'pill-red'">
                      {{ g.status === 'ok' ? 'ok' : 'failed' }}
                    </span>
                    <template v-else>
                      <span class="pill pill-dim">not recorded</span>
                      <span class="ml-2 text-[10px] text-zinc-600">{{ g.reason }}</span>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Transition>
  </UiPageShell>
</template>

<script setup lang="ts">
import UiSkeletonPanel from '~/components/ui/SkeletonPanel.vue'
import UiErrorState from '~/components/ui/ErrorState.vue'
import { errorText } from '~/utils/error-text'
import { rowDelay } from '~/utils/motion'

const apiFetch = useApiFetch()
definePageMeta({ middleware: 'auth' })

const loading = ref(true)
const error = ref<string | null>(null)
const pipelines = ref<any[]>([])
const cliGates = ref<any[]>([])
const gateRun = ref<any | null>(null)

function statusClass(status: string): string {
  return {
    ok: 'pill-blue',
    warnings: 'pill-amber',
    errors: 'pill-red',
    running: 'pill-blue',
  }[status] || 'pill-dim'
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

async function load() {
  loading.value = true
  error.value = null
  try {
    const data = await apiFetch('/api/gates')
    pipelines.value = data.pipelines || []
    cliGates.value = data.cli_gates || []
    gateRun.value = data.gate_run || null
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

useHead({ title: 'Gates · Protero' })
</script>

<style scoped>
.gates-grid {
  flex: 1 1 auto;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr);
}
</style>
