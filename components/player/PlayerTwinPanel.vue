<template>
  <section v-if="twin" class="bg-surface rounded-xl border border-edge/30 overflow-hidden">
    <div class="px-4 py-3 border-b border-edge/30 flex items-start justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-zinc-100">Twin</h2>
        <p class="text-[11px] text-zinc-500 leading-relaxed max-w-prose">
          Fitted ability — context about who this player is, never a price. No rating here
          implies an edge; it only says where this player sits among their peers.
        </p>
      </div>
      <span v-if="twin.state_as_of" class="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] bg-surface-light text-zinc-500 tabular-nums">
        state as of {{ twin.state_as_of.slice(0, 10) }}
      </span>
    </div>

    <!-- Metric cards: the fitted ability + career context -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 p-4">
      <LeagueMetricCard
        label="Ability"
        :value="abilityText"
        foot="fitted rating · ±SD"
        :peer-values="cohort"
        :own="twin.ability ?? undefined"
      />
      <LeagueMetricCard
        label="Rated"
        :value="String(twin.rated_games)"
        :foot="`${twin.effective_games != null ? Number(twin.effective_games).toFixed(1) : '—'} time-weighted`"
      />
      <LeagueMetricCard
        label="Appearances"
        :value="String(twin.appearances)"
        :foot="`${twin.starts} starts`"
      />
      <LeagueMetricCard
        label="Clubs"
        :value="String(Object.keys(twin.teams_played || {}).length)"
        :foot="`${Object.keys(twin.leagues_played || {}).length} divisions`"
      />
      <LeagueMetricCard
        label="Span"
        :value="twin.first_seen ? twin.first_seen.slice(0, 4) : '—'"
        :foot="twin.last_seen ? `first seen → ${twin.last_seen.slice(0, 4)}` : ''"
      />
    </div>

    <!-- Career moves -->
    <div class="px-4 pb-4">
      <div class="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider mb-2">Career clubs</div>
      <PlayerCareerMoves :teams="twin.teams_played" :team-names="teamNames" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TwinPlayer } from '~/composables/useTwins'

const props = defineProps<{
  twin: TwinPlayer
  /** Same-position cohort abilities for the peer strip. */
  cohort: number[]
  /** team_id -> name, for the career list. */
  teamNames: Record<string, string>
}>()

const abilityText = computed(() =>
  props.twin.ability == null
    ? '—'
    : `${Number(props.twin.ability).toFixed(2)}${props.twin.ability_var != null ? ' ± ' + Math.sqrt(Number(props.twin.ability_var)).toFixed(2) : ''}`
)
</script>
