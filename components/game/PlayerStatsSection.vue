<template>
  <div>
    <!-- Rating sort toggle -->
    <div class="flex items-center justify-end mb-3">
      <button
        type="button"
        class="text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors"
        :class="sortByRating ? 'bg-primary-600/20 text-[#8fbdf5]' : 'text-zinc-500 hover:text-zinc-300'"
        @click="sortByRating = !sortByRating"
      >
        Sort by rating
      </button>
    </div>

    <!-- Two Column Layout for Both Teams -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Home Team -->
      <div class="overflow-x-auto min-w-0">
        <h3 class="text-lg font-bold mb-4 text-zinc-100">{{ homeName }}</h3>
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b-2 border-primary-600 text-left">
              <th class="py-2 px-2 font-semibold text-zinc-300">#</th>
              <th class="py-2 px-2 font-semibold text-zinc-300">Player</th>
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
              v-for="player in homeStarters"
              :key="player.id"
              :player="player"
              :is-starter="true"
              :league-key="leagueKey"
            />

            <tr v-if="homeSubstitutes.length > 0">
              <td colspan="10" class="py-1 px-2 bg-surface-light text-[11px] font-semibold text-zinc-400 uppercase">
                Substitutes
              </td>
            </tr>

            <PlayerRow
              v-for="player in homeSubstitutes"
              :key="player.id"
              :player="player"
              :is-starter="false"
              :league-key="leagueKey"
            />
          </tbody>
        </table>
      </div>

      <!-- Away Team -->
      <div class="overflow-x-auto min-w-0">
        <h3 class="text-lg font-bold mb-4 text-zinc-100">{{ awayName }}</h3>
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b-2 border-primary-600 text-left">
              <th class="py-2 px-2 font-semibold text-zinc-300">#</th>
              <th class="py-2 px-2 font-semibold text-zinc-300">Player</th>
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
              v-for="player in awayStarters"
              :key="player.id"
              :player="player"
              :is-starter="true"
              :league-key="leagueKey"
            />

            <tr v-if="awaySubstitutes.length > 0">
              <td colspan="10" class="py-1 px-2 bg-surface-light text-[11px] font-semibold text-zinc-400 uppercase">
                Substitutes
              </td>
            </tr>

            <PlayerRow
              v-for="player in awaySubstitutes"
              :key="player.id"
              :player="player"
              :is-starter="false"
              :league-key="leagueKey"
            />
          </tbody>
        </table>
      </div>
    </div>

    <!-- Coverage footnote — goals/assists/minutes are not scraped into lineups. -->
    <p class="mt-4 text-[11px] text-zinc-600 leading-relaxed">
      Player ratings and box stats come from the FlashScore lineup feed. Goals, assists and minutes
      are not stored per player in this fixture's lineups, so they are omitted rather than shown as zero.
    </p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import PlayerRow from './PlayerRow.vue'

const props = defineProps({
  homeLineup: {
    type: Array,
    default: () => []
  },
  awayLineup: {
    type: Array,
    default: () => []
  },
  homeName: {
    type: String,
    required: true
  },
  awayName: {
    type: String,
    required: true
  },
  leagueKey: {
    type: String,
    default: null
  }
})

const sortByRating = ref(true)

// `is_starting_xi` is the real boolean column (not `starter`). A starter is
// `is_starting_xi = true`, or the flag missing entirely (NULL defaults true in
// older rows) — substitutes are explicitly false.
function isStarter(p) {
  if (typeof p.is_starting_xi === 'boolean') return p.is_starting_xi
  if (p.starter === 1 || p.starter === true) return true
  return false
}

function ratingVal(p) {
  const r = parseFloat(p.rating)
  return isNaN(r) ? -1 : r
}

const homeStarters = computed(() => {
  const rows = props.homeLineup.filter(isStarter)
  return sortByRating.value ? [...rows].sort((a, b) => ratingVal(b) - ratingVal(a)) : rows
})

const homeSubstitutes = computed(() => {
  const rows = props.homeLineup.filter(p => !isStarter(p))
  return sortByRating.value ? [...rows].sort((a, b) => ratingVal(b) - ratingVal(a)) : rows
})

const awayStarters = computed(() => {
  const rows = props.awayLineup.filter(isStarter)
  return sortByRating.value ? [...rows].sort((a, b) => ratingVal(b) - ratingVal(a)) : rows
})

const awaySubstitutes = computed(() => {
  const rows = props.awayLineup.filter(p => !isStarter(p))
  return sortByRating.value ? [...rows].sort((a, b) => ratingVal(b) - ratingVal(a)) : rows
})
</script>
