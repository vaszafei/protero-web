<template>
  <div v-if="risk" class="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
    <div class="flex items-start gap-2">
      <span class="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold mt-0.5"
            :class="risk.blind_side === 'both' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'">
        {{ risk.blind_side === 'both' ? 'BOTH BLIND' : 'BLIND SIDE' }}
      </span>
      <div class="min-w-0">
        <p class="text-xs text-amber-200 font-medium">{{ headline }}</p>
        <p class="text-[11px] text-amber-200/70 leading-relaxed mt-0.5">
          <span v-for="(s, i) in sides" :key="s.side">
            <template v-if="i > 0"> · </template>
            <span class="text-amber-200">{{ s.team }}</span>
            has {{ s.gamesInLeague }} game{{ s.gamesInLeague === 1 ? '' : 's' }} in
            {{ pretty(risk.league_key) }}; its rating was learned in
            {{ pretty(s.evidenceLeague) }}.
          </span>
        </p>
        <p class="text-[10px] text-amber-200/50 mt-1">
          Context from the twin layer, not a price — read the model's number here with less
          confidence, don't replace it.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** One `twin_fixture_risk` row, or null when the fixture carries no risk. */
  risk: { type: Object, default: null },
})

const sides = computed(() => {
  const r = props.risk
  if (!r) return []
  const out = []
  if (r.blind_side === 'home' || r.blind_side === 'both') {
    out.push({
      side: 'home', team: r.home_team,
      gamesInLeague: r.home_games_in_league,
      evidenceLeague: r.home_evidence_league,
    })
  }
  if (r.blind_side === 'away' || r.blind_side === 'both') {
    out.push({
      side: 'away', team: r.away_team,
      gamesInLeague: r.away_games_in_league,
      evidenceLeague: r.away_evidence_league,
    })
  }
  return out
})

const headline = computed(() =>
  props.risk?.blind_side === 'both'
    ? 'Neither club has history in this division.'
    : 'One club has no history in this division.')

function pretty(key) {
  return key ? key.replace(/_/g, ' ') : 'an unknown division'
}
</script>
