<template>
  <div class="space-y-4">
    <Card
      v-for="league in leagues"
      :key="league.key"
      hover
      class="cursor-pointer"
      @click="$emit('select', league.key)"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4 flex-1">
          <div class="w-12 h-12 rounded-lg bg-surface-light flex items-center justify-center text-2xl">
            {{ league.flag }}
          </div>
          <div class="flex-1">
            <h3 class="text-base font-semibold text-zinc-100">{{ league.name }}</h3>
            <p class="text-sm text-zinc-400">{{ getUpcomingCount(league.key) }} upcoming matches</p>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-right">
            <p class="text-xs text-zinc-500">Total Games</p>
            <p class="text-lg font-semibold text-zinc-100">{{ league.games_count || 0 }}</p>
          </div>
          <ChevronRight :size="20" class="text-zinc-500" />
        </div>
      </div>
      
      <!-- Quick preview of upcoming matches -->
      <div v-if="getUpcomingMatches(league.key).length > 0" class="mt-4 pt-4 border-t border-edge/50">
        <div class="space-y-2">
          <div
            v-for="game in getUpcomingMatches(league.key).slice(0, 2)"
            :key="game.id"
            class="flex items-center justify-between text-sm"
          >
            <span class="text-zinc-300">{{ game.home_name }}</span>
            <span class="text-xs text-zinc-500 px-2">vs</span>
            <span class="text-zinc-300">{{ game.away_name }}</span>
            <span class="text-xs text-zinc-500 ml-auto">Round {{ game.round }}</span>
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import Card from '~/components/ui/Card.vue'

const props = defineProps<{
  leagues: any[]
  allGames: any[]
}>()

defineEmits<{
  select: [leagueKey: string]
}>()

const getUpcomingCount = (leagueKey: string) => {
  return props.allGames.filter(
    g => g.league_key === leagueKey && g.status === 'scheduled'
  ).length
}

const getUpcomingMatches = (leagueKey: string) => {
  return props.allGames
    .filter(g => g.league_key === leagueKey && g.status === 'scheduled')
    .sort((a, b) => a.round - b.round)
}
</script>
