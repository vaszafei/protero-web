<template>
  <section class="panel panel-fill">
    <header class="panel-head">
      <h2 class="panel-title">Pipeline</h2>
      <UiTooltip class="ml-auto" :width="320" placement="bottom">
        <span class="panel-link">gates are CLI-only</span>
        <template #content>
          <p>Settlement, money and mask gates are CLI-only and write nothing to the database — they cannot be shown green here. Run <code>bash scripts/gates.sh</code>.</p>
        </template>
      </UiTooltip>
      <NuxtLink to="/gates" class="panel-link !ml-2">Gates →</NuxtLink>
    </header>

    <div class="divide-y divide-edge/40">
      <div v-for="p in pipelines" :key="p.pipeline" class="flex items-center gap-2 px-3 py-1.5 transition-colors duration-150 hover:bg-white/[0.02]">
        <span class="text-xs text-zinc-200 capitalize">{{ p.pipeline }}</span>
        <span class="text-[10px] text-zinc-600 tabular-nums flex-1">
          {{ ago(p.age_hours) }}
          <span v-if="p.errors" class="text-negative">· {{ p.errors }} error{{ p.errors === 1 ? '' : 's' }}</span>
          <span v-else-if="p.warnings" class="text-amber-400/70">· {{ p.warnings }} warning{{ p.warnings === 1 ? '' : 's' }}</span>
        </span>
        <span class="pill" :class="statusClass(p)">
          {{ p.stale ? 'STALE' : p.status.toUpperCase() }}
        </span>
      </div>

      <p v-if="!pipelines.length" class="px-3 py-2 text-[11px] text-zinc-600">No pipeline run recorded.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Pipeline health.
 *
 * `pipeline_runs` is written by the production finalize step, so it is live
 * (and, since 2026-10-01, its steps in `phase_runs`). Staleness is computed here rather than trusted from `status`: a
 * pipeline that stopped firing keeps its last row's "warnings" forever, which
 * reads as healthy.
 */
defineProps({
  pipelines: { type: Array, default: () => [] },
})

function statusClass(p) {
  if (p.stale) return 'pill-red'
  return {
    ok:       'pill-blue',
    success:  'pill-blue',
    warnings: 'pill-amber',
    errors:   'pill-red',
  }[p.status] || 'pill-dim'
}

function ago(hours) {
  if (hours == null) return 'never run'
  if (hours < 1) return `${Math.round(hours * 60)}m ago`
  if (hours < 48) return `${hours.toFixed(1)}h ago`
  return `${Math.round(hours / 24)}d ago`
}
</script>
