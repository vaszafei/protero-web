<template>
  <section class="rounded-lg border border-edge bg-surface overflow-hidden">
    <header class="flex items-baseline gap-2 px-3 py-2 border-b border-edge bg-surface-light/30">
      <h2 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Live slate</h2>
      <span class="text-[10px] text-zinc-600 tabular-nums">{{ rows.length }}</span>
      <span class="text-[10px] text-zinc-600">— open wagers on fixtures not yet settled</span>
    </header>

    <div v-if="!rows.length" class="px-3 py-8 text-center">
      <p class="text-sm text-zinc-500">Nothing open.</p>
      <p class="text-[11px] text-zinc-600 mt-1">
        The football pipeline places at 09:00, basketball at 11:00.
      </p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs min-w-[760px]">
        <thead>
          <tr class="text-zinc-500 border-b border-edge/60">
            <th class="text-left font-medium px-3 py-2 w-20">Kick-off</th>
            <th class="text-left font-medium px-3 py-2">Fixture</th>
            <th class="text-left font-medium px-3 py-2 w-32">Pick</th>
            <th class="text-right font-medium px-2 py-2 w-16">Odds</th>
            <th class="text-right font-medium px-2 py-2 w-20">Stake</th>
            <th class="text-right font-medium px-2 py-2 w-16" title="Expected value as modelled at placement — not a realised return">EV</th>
            <th class="text-left font-medium px-3 py-2 w-32">Wallet</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" class="border-t border-edge/40 hover:bg-surface-light/20">
            <td class="px-3 py-2 text-zinc-500 tabular-nums whitespace-nowrap">{{ kickoff(r.date) }}</td>
            <td class="px-3 py-2">
              <NuxtLink :to="`/game/${r.game_id}`" class="text-zinc-200 hover:text-blue-400">
                {{ r.home }} <span class="text-zinc-600">v</span> {{ r.away }}
              </NuxtLink>
              <span class="ml-1.5 text-[10px] text-zinc-600">{{ leagueLabel(r.league_key) }}</span>
              <span
                v-if="blind[r.game_id]"
                class="ml-1.5 px-1 py-0.5 rounded text-[9px] font-semibold bg-amber-500/15 text-amber-300"
                :title="`A club here has no history in this division (${blind[r.game_id]}). Twin warning, not a price.`"
              >BLIND {{ blind[r.game_id] }}</span>
            </td>
            <td class="px-3 py-2 text-zinc-300">{{ pickLabel(r) }}</td>
            <td class="px-2 py-2 text-right tabular-nums text-zinc-400">{{ Number(r.odds).toFixed(2) }}</td>
            <td class="px-2 py-2 text-right tabular-nums text-zinc-300">${{ Number(r.stake).toFixed(2) }}</td>
            <td class="px-2 py-2 text-right tabular-nums" :class="evClass(r.expected_value)">
              {{ r.expected_value == null ? '—' : (Number(r.expected_value) * 100).toFixed(0) + '%' }}
            </td>
            <td class="px-3 py-2 text-zinc-500 truncate">
              <NuxtLink :to="`/wallet?w=${r.wallet_id}`" class="hover:text-zinc-300">{{ r.wallet_name }}</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="text-[10px] text-zinc-600 px-3 py-2 border-t border-edge/40 leading-relaxed">
      EV is what the model believed at placement, not a realised return. Football V6 stakes a flat
      0.05 Kelly fraction capped at 5% of bankroll; parlays are not listed here — see the wallet.
    </p>
  </section>
</template>

<script setup>
/**
 * What the machine currently has money on.
 *
 * Parlays are deliberately absent: a parlay's risk is its own `total_stake`,
 * counted once, and rendering its legs here would restate the leg-counting
 * error that reported W21 at -2.1% where it is -76.8%. The exposure bar counts
 * them; the wallet page shows them grouped.
 */
import { computed } from 'vue'
import { betLabelShort } from '~/utils/bet-label'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  blindSpots: { type: Array, default: () => [] },
})

/** game_id → which side the twin is blind on. */
const blind = computed(() => {
  const m = {}
  for (const b of props.blindSpots) m[b.game_id] = b.blind_side
  return m
})

function kickoff(d) {
  const dt = new Date(d)
  const today = new Date()
  const sameDay = dt.toDateString() === today.toDateString()
  const time = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return sameDay ? time : `${dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} ${time}`
}

function leagueLabel(key) {
  return (key || '').replace(/_/g, ' ')
}

function pickLabel(r) {
  try {
    return betLabelShort({ bet_type: r.bet_type, notes: r.notes, sport: r.sport })
  } catch {
    return r.bet_type
  }
}

function evClass(ev) {
  if (ev == null) return 'text-zinc-600'
  return Number(ev) > 0 ? 'text-emerald-400' : 'text-red-400'
}
</script>
