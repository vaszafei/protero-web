<template>
  <section v-if="managers.length" class="panel panel-fill">
    <header class="panel-head">
      <h3 class="panel-title">Managers</h3>
      <span class="panel-count">{{ managers.length }}</span>
      <UiTooltip class="ml-auto" :width="340" placement="bottom">
        <span class="panel-link">most league games</span>
        <template #content>
          <p>
            Managers who have held a job in this competition, keyed by entity id — never by name. The formation
            is their most-used shape across that history, a fact about the past, not a price. Context only,
            like every twin surface.
          </p>
        </template>
      </UiTooltip>
    </header>

    <div class="divide-y divide-edge/40">
      <div v-for="m in top" :key="m.coach_id" class="px-3 py-1 flex items-baseline gap-2">
        <span class="text-[11px] text-zinc-200 truncate">{{ m.coach_name || 'Unknown' }}</span>
        <span class="text-[10px] text-zinc-600 tabular-nums">{{ leagueGames(m) }} in league</span>
        <span class="text-[10px] text-zinc-500">{{ topFormations(m, 1)[0]?.[0] || '' }}</span>
        <span class="ml-auto text-[10px] text-zinc-600 tabular-nums">{{ m.games }} total</span>
      </div>
      <div v-if="rest.length" class="px-3 py-1">
        <UiTooltip :width="320" placement="bottom">
          <span class="text-[10px] text-zinc-500 hover:text-zinc-300 cursor-default">+{{ rest.length }} more managers</span>
          <template #content>
            <p v-for="m in rest" :key="m.coach_id" class="flex gap-2">
              <span>{{ m.coach_name || 'Unknown' }}</span>
              <span class="opacity-70">{{ leagueGames(m) }} in league · {{ topFormations(m, 1)[0]?.[0] || '—' }}</span>
            </p>
          </template>
        </UiTooltip>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * A competition's managerial landscape — the manager twin surfaced.
 *
 * `twin_manager` is the entity-id-keyed rollup built by
 * `ml/twins/build_managers.py` (2026-09-01). It is context, exactly like the
 * club twin: a manager's formation fingerprint describes history, and the
 * first-pass measurement (research/managers/formation_corr.py) found formation
 * and manager identity both already priced by the close. Never render as edge.
 */
import { computed } from 'vue'

const props = defineProps({
  managers: { type: Array as () => any[], default: () => [] },
  leagueKey: { type: String, required: true },
})

const TOP_N = 5
const top = computed(() => props.managers.slice(0, TOP_N))
const rest = computed(() => props.managers.slice(TOP_N))

function leagueGames(m: any) {
  return Number(m?.leagues_managed?.[props.leagueKey] || 0)
}

/** Most-used formations, sorted desc — a manager's tactical fingerprint. */
function topFormations(m: any, n: number) {
  const fm = m?.formations_used || {}
  return Object.entries(fm)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
}
</script>
