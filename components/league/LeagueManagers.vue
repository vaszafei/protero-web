<template>
  <section v-if="managers.length" class="panel">
    <header class="panel-head">
      <h3 class="panel-title">Managers</h3>
      <span class="text-[10px] text-zinc-600 tabular-nums">{{ managers.length }}</span>
      <span class="ml-auto text-[10px] text-zinc-600 hidden sm:inline">most league games</span>
    </header>

    <div class="divide-y divide-edge/40">
      <div
        v-for="m in managers"
        :key="m.coach_id"
        class="px-3 py-2"
      >
        <div class="flex items-baseline gap-2">
          <span class="text-[11px] text-zinc-200 truncate">{{ m.coach_name || 'Unknown' }}</span>
          <span class="text-[10px] text-zinc-600 tabular-nums">{{ leagueGames(m) }} in league</span>
          <span class="ml-auto text-[10px] text-zinc-600 tabular-nums">{{ m.games }} total</span>
        </div>
        <div class="mt-1 flex items-center gap-1 flex-wrap">
          <span
            v-for="f in topFormations(m, 3)"
            :key="f[0]"
            class="text-[10px] text-zinc-500"
          >{{ f[0] }}<span class="text-zinc-700">·{{ f[1] }}</span></span>
          <span v-if="!topFormations(m, 3).length" class="text-[10px] text-zinc-700">no formation record</span>
        </div>
      </div>
    </div>

    <p class="px-3 py-2 border-t border-edge/40 text-[10px] text-zinc-600 leading-relaxed">
      Managers who have held a job in this competition, keyed by entity id — never by name.
      The formation is their most-used shape across that history, a fact about the past, not a
      price. Context only, like every twin surface.
    </p>
  </section>
</template>

<script setup>
/**
 * A competition's managerial landscape — the manager twin surfaced.
 *
 * `twin_manager` is the entity-id-keyed rollup built by
 * `ml/twins/build_managers.py` (2026-09-01). It is context, exactly like the
 * club twin: a manager's formation fingerprint describes history, and the
 * first-pass measurement (research/managers/formation_corr.py) found formation
 * and manager identity both already priced by the close. Never render as edge.
 */
const props = defineProps({
  managers: { type: Array, default: () => [] },
  leagueKey: { type: String, required: true },
})

function leagueGames(m) {
  return Number(m?.leagues_managed?.[props.leagueKey] || 0)
}

/** Most-used formations, sorted desc — a manager's tactical fingerprint. */
function topFormations(m, n) {
  const fm = m?.formations_used || {}
  return Object.entries(fm)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
}
</script>
