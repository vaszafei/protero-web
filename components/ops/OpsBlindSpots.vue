<template>
  <section class="panel overflow-hidden">
    <header class="panel-head">
      <h2 class="panel-title">Carried ratings</h2>
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
        class="block px-3 py-2 transition-colors duration-150 hover:bg-white/[0.03]"
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
            CARRY {{ r.blind_side }}
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
      A club playing outside the division its rating was learned in. Every club listed here has a twin
      rating — what is unreliable is how that rating carries across the move: carried ratings are
      measurably over-confident (Cox slope <span class="text-zinc-500">0.44</span>, against
      <span class="text-zinc-500">1.03</span> elsewhere). A warning about our own model, not about the
      market — Dixon-Coles scores these fixtures better than unflagged ones (BSS
      <span class="text-zinc-500">+0.045</span> vs <span class="text-zinc-500">+0.015</span>), so this is
      not a do-not-bet flag.
    </p>
  </section>
</template>

<script setup>
/**
 * Fixtures where a club is playing outside the division its twin rating was learned in.
 *
 * NOT a blind spot in the "we know nothing about this club" sense — that framing was
 * measured false on 2026-08-22 (34 flagged sides in the live 7-day window, ZERO unrated,
 * min 39 tracked games). The real defect is the CARRY: slope 0.440 vs 1.028 overall.
 * The DC-unrated population — the one that genuinely has no price — is a different set
 * and is not persisted anywhere yet; do not merge the two.
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
