<template>
  <section class="rounded-lg border border-edge bg-surface overflow-hidden">
    <header class="flex items-baseline gap-2 px-3 py-2 border-b border-edge bg-surface-light/30">
      <h2 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Pipeline</h2>
      <NuxtLink to="/gates" class="ml-auto text-[10px] text-zinc-500 hover:text-zinc-300">Gates →</NuxtLink>
    </header>

    <div class="divide-y divide-edge/40">
      <div v-for="p in pipelines" :key="p.pipeline" class="px-3 py-2.5">
        <div class="flex items-center gap-2">
          <span class="text-xs text-zinc-200 capitalize flex-1">{{ p.pipeline }}</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold" :class="statusClass(p)">
            {{ p.stale ? 'STALE' : p.status.toUpperCase() }}
          </span>
        </div>
        <p class="text-[10px] text-zinc-600 tabular-nums mt-0.5">
          {{ ago(p.age_hours) }}
          <span v-if="p.errors" class="text-red-400">· {{ p.errors }} error{{ p.errors === 1 ? '' : 's' }}</span>
          <span v-else-if="p.warnings" class="text-amber-400/70">· {{ p.warnings }} warning{{ p.warnings === 1 ? '' : 's' }}</span>
        </p>
      </div>

      <div v-if="!pipelines.length" class="px-3 py-6 text-center">
        <p class="text-[11px] text-zinc-600">No pipeline run recorded.</p>
      </div>
    </div>

    <!-- The three CLI gates persist nothing. Saying so is the point. -->
    <div class="px-3 py-2 border-t border-edge/40">
      <p class="text-[10px] text-zinc-600 leading-relaxed">
        Settlement, money and mask gates are CLI-only and write nothing to the database — they
        cannot be shown green here. Run <code class="text-zinc-500">bash scripts/gates.sh</code>.
      </p>
    </div>
  </section>
</template>

<script setup>
/**
 * Pipeline health.
 *
 * `pipeline_runs` is written by the production finalize step, so it is live.
 * `phase_runs` is not (last row 2026-05-02, DAG runner only) and is therefore
 * absent. Staleness is computed here rather than trusted from `status`: a
 * pipeline that stopped firing keeps its last row's "warnings" forever, which
 * reads as healthy.
 */
defineProps({
  pipelines: { type: Array, default: () => [] },
})

function statusClass(p) {
  if (p.stale) return 'bg-red-500/15 text-red-300'
  return {
    ok:       'bg-emerald-500/15 text-emerald-300',
    success:  'bg-emerald-500/15 text-emerald-300',
    warnings: 'bg-amber-500/15 text-amber-300',
    errors:   'bg-red-500/15 text-red-300',
  }[p.status] || 'bg-zinc-700/40 text-zinc-400'
}

function ago(hours) {
  if (hours == null) return 'never run'
  if (hours < 1) return `${Math.round(hours * 60)}m ago`
  if (hours < 48) return `${hours.toFixed(1)}h ago`
  return `${Math.round(hours / 24)}d ago`
}
</script>
