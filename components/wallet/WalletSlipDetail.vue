<template>
  <div class="rounded-xl bg-surface border border-edge flex flex-col min-h-0 overflow-hidden">
    <div v-if="!parlay" class="flex-1 flex items-center justify-center text-[11px] text-zinc-500">
      Select a slip to see its legs.
    </div>

    <template v-else>
      <!-- One header line: shape, price, stake, outcome, date, strategy. -->
      <div class="flex items-center gap-2.5 px-3 py-2 border-b border-edge/50 flex-shrink-0">
        <div class="w-2 h-2 rounded-full flex-shrink-0" :class="STATUS_DOT[parlay.status] || 'bg-zinc-500'"></div>
        <h3 class="text-[12px] font-semibold text-zinc-100">{{ legs.length }}-leg slip</h3>
        <span class="text-[12px] tabular-nums text-amber-300">@ {{ Number(parlay.parlay_odds || 0).toFixed(2) }}</span>
        <span class="text-[11px] text-zinc-500 truncate">{{ dateLabel }}<template v-if="stratLabel"> · {{ stratLabel }}</template></span>
        <span v-if="settledLegs" class="text-[11px] text-zinc-500 tabular-nums flex-shrink-0">
          · {{ wonLegs }}/{{ legs.length }} legs won
        </span>
        <div class="ml-auto text-right flex-shrink-0 tabular-nums">
          <span class="text-[12px] font-semibold text-zinc-200">{{ formatMoney(parlay.total_stake || 0) }}</span>
          <span v-if="parlay.status === 'pending'" class="text-[11px] text-amber-400/80 ml-2">
            → {{ formatMoney(Number(parlay.total_stake || 0) * Number(parlay.parlay_odds || 0)) }}
          </span>
          <span v-else-if="parlay.profit != null" class="text-[11px] font-bold ml-2"
                :class="Number(parlay.profit) >= 0 ? 'text-emerald-400' : 'text-red-400'">
            {{ formatMoney(parlay.profit, { signed: true }) }}
          </span>
        </div>
      </div>

      <!-- Legs. A prop leg reads player · selection, a bet builder one line per
           part, anything else its bet label. The analyst's note is on hover. -->
      <div class="flex-1 min-h-0 overflow-y-auto">
        <table class="w-full text-[11px]">
          <thead class="sticky top-0 bg-surface">
            <tr class="text-[10px] text-zinc-500 uppercase tracking-wide">
              <th class="w-7 py-1.5 pl-3 text-left font-medium">#</th>
              <th class="py-1.5 text-left font-medium">{{ hasProps ? 'Player' : 'Selection' }}</th>
              <th v-if="hasProps" class="py-1.5 text-left font-medium">Selection</th>
              <th class="py-1.5 text-left font-medium">Game</th>
              <th class="py-1.5 text-right font-medium">Odds</th>
              <th class="py-1.5 pr-3 text-right font-medium w-16">Result</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-edge/20">
            <tr v-for="leg in rows" :key="leg.id" class="hover:bg-surface-light/30 align-top" :title="leg.note || undefined">
              <td class="py-1.5 pl-3 text-zinc-500 tabular-nums">{{ leg.leg_number }}</td>
              <template v-if="hasProps">
                <td class="py-1.5 pr-2 text-zinc-100 font-medium max-w-[180px]">
                  <p v-for="(part, i) in leg.parts" :key="i" class="truncate">{{ part.player || '—' }}</p>
                </td>
                <td class="py-1.5 pr-2 text-emerald-400/90 font-semibold whitespace-nowrap">
                  <p v-for="(part, i) in leg.parts" :key="i">{{ part.selection }}</p>
                </td>
              </template>
              <td v-else class="py-1.5 pr-2 text-emerald-400/90 font-semibold max-w-[240px]">
                <p v-for="(part, i) in leg.parts" :key="i" class="truncate">{{ part.selection }}</p>
              </td>
              <td class="py-1.5 pr-2 text-zinc-400 truncate max-w-[220px]">
                <NuxtLink v-if="leg.game_id" :to="`/game/${leg.game_id}`" class="hover:text-zinc-200">
                  {{ displayTeamName(leg.home_name) }} – {{ displayTeamName(leg.away_name) }}
                  <span v-if="leg.score" class="text-zinc-500 tabular-nums"> {{ leg.score }}</span>
                </NuxtLink>
              </td>
              <td class="py-1.5 text-right text-zinc-300 tabular-nums">{{ Number(leg.odds || 0).toFixed(2) }}</td>
              <td class="py-1.5 pr-3 text-right">
                <span class="text-[10px] font-semibold uppercase" :class="STATUS_TEXT[leg.status] || 'text-zinc-500'">
                  {{ leg.status || '—' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { formatMoney } from '~/utils/formatters'
import { computed } from 'vue'
import { legParts } from '~/utils/bet-label'
import { displayTeamName } from '~/utils/team-name'

const props = defineProps({
  /** One `fetchWalletParlays` row, or null. */
  parlay: { type: Object, default: null },
})

const STATUS_DOT = {
  won: 'bg-emerald-400', lost: 'bg-red-400', pending: 'bg-amber-400 animate-pulse', pushed: 'bg-zinc-400',
}
const STATUS_TEXT = {
  won: 'text-emerald-400', lost: 'text-red-400', pending: 'text-amber-400', void: 'text-zinc-400', push: 'text-zinc-400',
}

const legs = computed(() => props.parlay?.legs || [])

const rows = computed(() => legs.value.map(leg => ({
  ...leg,
  parts: legParts(leg),
  note: leg.notes?.analysis || null,
  score: leg.home_goals == null || leg.away_goals == null ? '' : `${leg.home_goals}–${leg.away_goals}`,
})))

const hasProps = computed(() => rows.value.some(r => r.parts.some(p => p.player)))
const settledLegs = computed(() => legs.value.filter(l => l.status === 'won' || l.status === 'lost').length)
const wonLegs = computed(() => legs.value.filter(l => l.status === 'won').length)

const dateLabel = computed(() => {
  const d = props.parlay?.created_at
  return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
})

const stratLabel = computed(() => String(props.parlay?.strategy || '')
  .replace(/^props_v2_/, 'Props ').replace(/_aif$/, ' AIF').replace(/_/g, ' '))
</script>
