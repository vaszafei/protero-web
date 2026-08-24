<template>
  <div class="ratings-card panel-glass rounded-lg overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5">
      <span class="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Player Ratings</span>
      <button
        type="button"
        class="pill transition-colors"
        :class="sortByRating ? 'pill-blue' : 'pill-dim'"
        @click="sortByRating = !sortByRating"
      >
        Sort by rating
      </button>
    </div>

    <div class="h-px mx-3" :style="{ background: divider }" />

    <!-- Data table — same columns as the old player stats table -->
    <div class="scroll-fade-x">
      <table class="w-full text-xs min-w-[560px]">
        <thead>
          <tr class="text-zinc-500">
            <th class="sticky-col-1 py-2 px-2 font-semibold text-zinc-300 text-left">#</th>
            <th class="sticky-col-2 py-2 px-2 font-semibold text-zinc-300 text-left">Player</th>
            <th class="py-2 px-2 font-semibold text-zinc-300 text-center">Rating</th>
            <th class="py-2 px-2 font-semibold text-zinc-300 text-center">xG</th>
            <th class="py-2 px-2 font-semibold text-zinc-300 text-center">Shots</th>
            <th class="py-2 px-2 font-semibold text-zinc-300 text-center">SOT</th>
            <th class="py-2 px-2 font-semibold text-zinc-300 text-center">Passes</th>
            <th class="py-2 px-2 font-semibold text-zinc-300 text-center">Touches</th>
            <th class="py-2 px-2 font-semibold text-zinc-300 text-center">Dribbles</th>
            <th class="py-2 px-2 font-semibold text-zinc-300 text-center">Tackles</th>
          </tr>
        </thead>
        <tbody>
          <PlayerRow
            v-for="player in starters"
            :key="player.id"
            :player="player"
            :is-starter="true"
            :league-key="leagueKey"
          />

          <tr v-if="substitutes.length > 0">
            <td colspan="10" class="py-1 px-2 bg-surface-light text-[11px] font-semibold text-zinc-400 uppercase">
              Substitutes
            </td>
          </tr>

          <PlayerRow
            v-for="player in substitutes"
            :key="player.id"
            :player="player"
            :is-starter="false"
            :league-key="leagueKey"
          />
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { VIZ_HOME, VIZ_AWAY } from '~/utils/viz'
import PlayerRow from './PlayerRow.vue'

const props = defineProps<{
  side: 'home' | 'away'
  lineup: Array<Record<string, any>>
  mirror?: boolean
  leagueKey?: string | null
}>()

const color = computed(() => (props.side === 'home' ? VIZ_HOME : VIZ_AWAY))

const divider = computed(() =>
  props.mirror
    ? `linear-gradient(270deg, ${color.value}26, transparent)`
    : `linear-gradient(90deg, ${color.value}26, transparent)`
)

const sortByRating = ref(true)

function isStarter(p: Record<string, any>): boolean {
  if (typeof p.is_starting_xi === 'boolean') return p.is_starting_xi
  if (p.starter === 1 || p.starter === true) return true
  return false
}

function ratingVal(p: Record<string, any>): number {
  const r = parseFloat(p.rating)
  return isNaN(r) ? -1 : r
}

const starters = computed(() => {
  const rows = (props.lineup || []).filter(isStarter)
  return sortByRating.value ? [...rows].sort((a, b) => ratingVal(b) - ratingVal(a)) : rows
})

const substitutes = computed(() => {
  const rows = (props.lineup || []).filter((p) => !isStarter(p))
  return sortByRating.value ? [...rows].sort((a, b) => ratingVal(b) - ratingVal(a)) : rows
})
</script>

<style scoped>
.ratings-card {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.02);
}
</style>
