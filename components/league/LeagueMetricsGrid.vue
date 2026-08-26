<template>
  <div v-if="pending" class="grid grid-cols-3 gap-2.5">
    <div v-for="i in 3" :key="i" class="rounded-lg border border-edge/40 bg-surface/60 p-3 animate-pulse">
      <div class="h-2 w-14 rounded bg-white/5 mb-2.5"></div>
      <div class="h-5 w-12 rounded bg-white/5"></div>
    </div>
  </div>

  <div v-else-if="twin" class="grid grid-cols-3 gap-2.5">
    <!-- Three metrics, not five — Clubs and Fitted on were dropped 2026-08-25
         (owner call): they describe the twin's own bookkeeping, not the
         competition, and the Level card left 2026-08-25 for the same reason. -->
    <LeagueMetricCard
      label="Home adv."
      hint="Home-advantage term in log-goals"
      :value="num(twin.home_adv, 3)"
      foot="log-goals"
      :peer-values="peerScale.home_adv"
      :own="twin.home_adv"
    />
    <LeagueMetricCard
      label="Spread"
      hint="How far apart this competition's clubs are"
      :value="twin.is_cup ? '—' : num(twin.spread, 3)"
      :muted="!!twin.is_cup"
      :foot="twin.is_cup ? 'cups pool tiers' : 'club dispersion'"
      :peer-values="twin.is_cup ? [] : peerScale.spread"
      :own="twin.is_cup ? null : twin.spread"
    />
    <LeagueMetricCard
      label="Avg goals"
      :value="num(twin.avg_goals, 2)"
      foot="per game"
      :peer-values="peerScale.avg_goals"
      :own="twin.avg_goals"
    />
  </div>

  <!-- Outside the fitted corpus. Said plainly, once, rather than as three empty cards. -->
  <div v-else-if="!pending" class="rounded-lg border border-edge/40 bg-surface/60 px-4 py-3">
    <p class="text-xs text-zinc-300 font-medium">No twin for this competition.</p>
    <p class="text-[11px] text-zinc-500 mt-1 leading-relaxed max-w-3xl">
      The entity layer is fitted on the European football corpus. Basketball, LATAM football and
      national-team fixtures sit outside it — they have games and predictions, but no fitted level,
      club ratings or transition record. Nothing is wrong; there is simply no twin to show.
    </p>
  </div>
</template>

<script setup>
/**
 * The twin's headline metrics — pulled out of LeagueOverview 2026-08-25 so it
 * can sit beside the hero card in the page header (same row, right column)
 * instead of stacking below the tabs.
 */
import { computed } from 'vue'
import LeagueMetricCard from '~/components/league/LeagueMetricCard.vue'

const props = defineProps({
  twin: { type: Object, default: null },
  pending: { type: Boolean, default: false },
  /** Every fitted competition — the peer distribution behind each metric strip. */
  peers: { type: Array, default: () => [] },
})

/** Peers of the same kind only — a cup's level is not a league's level. */
const samePeers = computed(() =>
  props.peers.filter(p => !!p.is_cup === !!props.twin?.is_cup)
)

const peerScale = computed(() => ({
  home_adv: samePeers.value.map(p => p.home_adv),
  spread: samePeers.value.map(p => p.spread),
  avg_goals: samePeers.value.map(p => p.avg_goals),
}))

function num(v, dp) {
  if (v == null) return '—'
  const n = Number(v)
  if (Object.is(n, -0)) return (0).toFixed(dp)
  return n.toFixed(dp)
}
</script>
