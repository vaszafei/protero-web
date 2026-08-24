<template>
  <section v-if="twin" class="bg-surface rounded-xl border border-edge/30 overflow-hidden">
    <div class="px-4 py-3 border-b border-edge/30 flex items-start justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-zinc-100">Twin</h2>
        <p class="text-[11px] text-zinc-500 leading-relaxed max-w-prose">
          Fitted per-36 rates — context about who this player is, never a price. Each rate is
          shrunk toward its position cohort; nothing here implies an edge.
        </p>
      </div>
      <span v-if="twin.state_as_of" class="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] bg-surface-light text-zinc-500 tabular-nums">
        state as of {{ twin.state_as_of.slice(0, 10) }}
      </span>
    </div>

    <!-- The three fitted latents, each with a same-position peer strip -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 p-4">
      <LeagueMetricCard
        label="Points / 36"
        :value="rateText(twin.points_rate, twin.points_var)"
        foot="fitted rate · ±SD"
        :peer-values="cohort.points"
        :own="twin.points_rate ?? undefined"
      />
      <LeagueMetricCard
        label="Rebounds / 36"
        :value="rateText(twin.rebounds_rate, twin.rebounds_var)"
        foot="fitted rate · ±SD"
        :peer-values="cohort.rebounds"
        :own="twin.rebounds_rate ?? undefined"
      />
      <LeagueMetricCard
        label="Assists / 36"
        :value="rateText(twin.assists_rate, twin.assists_var)"
        foot="fitted rate · ±SD"
        :peer-values="cohort.assists"
        :own="twin.assists_rate ?? undefined"
      />
    </div>

    <!-- Career context -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 pb-4">
      <LeagueMetricCard
        label="Minutes"
        :value="twin.minutes != null ? Number(twin.minutes).toFixed(1) : '—'"
        foot="recent role"
      />
      <LeagueMetricCard
        label="Games"
        :value="String(twin.games)"
        :foot="`${twin.effective_games != null ? Number(twin.effective_games).toFixed(1) : '—'} time-weighted`"
      />
      <LeagueMetricCard
        label="Clubs"
        :value="String(Object.keys(twin.teams_played || {}).length)"
        :foot="`${twin.position || 'position unknown'} cohort`"
      />
      <LeagueMetricCard
        label="Span"
        :value="twin.first_seen ? twin.first_seen.slice(0, 4) : '—'"
        :foot="twin.last_seen ? `first seen → ${twin.last_seen.slice(0, 4)}` : ''"
      />
    </div>

    <!-- Career clubs -->
    <div class="px-4 pb-4">
      <div class="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider mb-2">Career clubs</div>
      <PlayerCareerMoves :teams="twin.teams_played" :team-names="teamNames" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BasketballPlayerTwin } from '~/composables/useTwins'

const props = defineProps<{
  twin: BasketballPlayerTwin
  /** Same-position per-36 peer values, split per column. */
  cohort: { points: number[]; rebounds: number[]; assists: number[] }
  /** team_id -> name, for the career list. */
  teamNames: Record<string, string>
}>()

function rateText(rate: number | null, variance: number | null): string {
  if (rate == null) return '—'
  return variance != null
    ? `${Number(rate).toFixed(1)} ± ${Math.sqrt(Number(variance)).toFixed(1)}`
    : Number(rate).toFixed(1)
}
</script>
