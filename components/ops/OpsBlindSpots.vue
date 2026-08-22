<template>
  <section class="rounded-lg border border-edge bg-surface overflow-hidden">
    <header class="flex items-baseline gap-2 px-3 py-2 border-b border-edge bg-surface-light/30">
      <h2 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Blind spots</h2>
      <span class="text-[10px] text-zinc-600 tabular-nums">{{ total }}</span>
      <span class="text-[10px] text-zinc-600">— next 7 days</span>
    </header>

    <div v-if="!rows.length" class="px-3 py-6 text-center">
      <p class="text-[11px] text-zinc-600">No fixture this week involves a club that changed division.</p>
    </div>

    <div v-else class="divide-y divide-edge/40">
      <NuxtLink
        v-for="r in rows" :key="r.game_id"
        :to="`/game/${r.game_id}`"
        class="block px-3 py-2 hover:bg-surface-light/20"
      >
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-zinc-600 tabular-nums w-12 flex-shrink-0">{{ shortDate(r.date) }}</span>
          <span class="text-xs text-zinc-300 truncate flex-1">
            <span :class="isBlind(r, 'home') ? 'text-amber-300' : ''">{{ r.home_team }}</span>
            <span class="text-zinc-600 mx-1">v</span>
            <span :class="isBlind(r, 'away') ? 'text-amber-300' : ''">{{ r.away_team }}</span>
          </span>
          <span class="px-1 py-0.5 rounded text-[9px] font-semibold flex-shrink-0"
                :class="r.blind_side === 'both' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'">
            {{ r.blind_side }}
          </span>
        </div>
        <p class="text-[10px] text-zinc-600 ml-14 truncate">
          {{ leagueLabel(r.league_key) }} ·
          rating from
          <span v-if="isBlind(r, 'home')">{{ leagueLabel(r.home_evidence_league) }}</span>
          <span v-if="r.blind_side === 'both'"> / </span>
          <span v-if="isBlind(r, 'away')">{{ leagueLabel(r.away_evidence_league) }}</span>
        </p>
      </NuxtLink>
    </div>

    <p class="text-[10px] text-zinc-600 px-3 py-2 border-t border-edge/40 leading-relaxed">
      A club with no history in the division it is playing in gets priced as league-average — which
      is how a promoted side is priced as mid-table. Fixtures to distrust, not to bet.
    </p>
  </section>
</template>

<script setup>
/**
 * The twin layer's one genuinely actionable output.
 *
 * Twins are NOT a pricing input (owner decision 2026-08-21, do-not-do §2 —
 * 55 of 56 cells scored negative against the close). This panel is the warning
 * surface they ARE good for, and must never be rendered as an edge signal.
 */
defineProps({
  rows: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
})

function isBlind(r, side) {
  return r.blind_side === 'both' || r.blind_side === side
}

function leagueLabel(key) {
  return (key || '—').replace(/_/g, ' ')
}

function shortDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}
</script>
