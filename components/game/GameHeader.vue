<template>
  <div class="game-header-card rounded-lg overflow-hidden">
    <!-- League Info - subtle strip with brand gradient underline -->
    <div class="relative px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
      <div class="flex items-center gap-2 sm:gap-3">
        <span class="text-lg sm:text-xl">{{ game.league_flag }}</span>
        <div>
          <h3 class="font-semibold text-sm sm:text-base text-zinc-200">{{ game.league_name }}</h3>
          <p class="text-xs text-zinc-500">{{ game.round && game.round !== 0 && game.round !== '0' ? `Round ${game.round}` : game.league_name }}</p>
        </div>
      </div>
      <div class="text-right text-xs sm:text-sm">
        <p class="text-zinc-400">{{ formatDate(game.date) }}</p>
        <p class="font-medium text-zinc-300">{{ formatTime(game.date) }}</p>
      </div>
      <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[#f82828]/20 via-edge/40 to-[#0848a8]/20" />
    </div>

    <!-- Match Score -->
    <div class="px-3 sm:px-6 py-5 sm:py-8">
      <div class="grid grid-cols-[1fr,auto,1fr] items-center gap-3 sm:gap-8">
        <!-- Home Team -->
        <div class="flex flex-col items-center sm:items-end gap-1.5">
          <div class="home-glow">
            <img 
              v-if="homeLogo && !homeImgError" 
              :src="homeLogo" 
              :alt="game.home_name" 
              class="w-10 h-10 sm:w-12 sm:h-12 object-contain"
              @error="homeImgError = true"
            />
            <div v-else class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#f82828]/12 border border-[#f82828]/20 flex items-center justify-center">
              <span class="text-sm sm:text-base font-extrabold text-[#f82828]/70 tracking-tight">{{ homeAbbr }}</span>
            </div>
          </div>
          <h1 class="text-xs sm:text-base font-semibold text-zinc-200 text-center sm:text-right leading-tight">{{ game.home_name }}</h1>
          <p v-if="sport === 'football' && game.home_formation" class="text-[10px] sm:text-xs text-zinc-500">
            {{ game.home_formation }}
          </p>
        </div>

        <!-- Score -->
        <div class="text-center min-w-[80px] sm:min-w-[110px]">
          <div v-if="game.status === 'completed'" class="space-y-1.5">
            <div class="flex items-center justify-center gap-2 sm:gap-3">
              <span class="text-3xl sm:text-5xl font-bold text-zinc-100">{{ game.home_goals }}</span>
              <span class="text-lg sm:text-2xl text-zinc-600 font-light">-</span>
              <span class="text-3xl sm:text-5xl font-bold text-zinc-100">{{ game.away_goals }}</span>
            </div>
            <span class="inline-block px-2 py-0.5 score-badge text-[10px] sm:text-xs font-medium rounded-full tracking-wide uppercase">
              Full Time
            </span>
          </div>
          <div v-else-if="game.status === 'live'" class="space-y-1.5">
            <div class="flex items-center justify-center gap-2 sm:gap-3">
              <span class="text-3xl sm:text-5xl font-bold text-zinc-100">{{ game.home_goals || 0 }}</span>
              <span class="text-lg sm:text-2xl text-zinc-600 font-light">-</span>
              <span class="text-3xl sm:text-5xl font-bold text-zinc-100">{{ game.away_goals || 0 }}</span>
            </div>
            <span class="inline-block px-2 py-0.5 bg-red-500/15 text-red-400 text-[10px] sm:text-xs font-medium rounded-full animate-pulse uppercase tracking-wide">
              Live
            </span>
          </div>
          <div v-else class="space-y-1.5">
            <div class="text-2xl sm:text-4xl font-semibold text-zinc-600">VS</div>
            <span class="inline-block px-2 py-0.5 bg-zinc-700/40 text-zinc-500 text-[10px] sm:text-xs font-medium rounded-full tracking-wide uppercase">
              Scheduled
            </span>
          </div>
        </div>

        <!-- Away Team -->
        <div class="flex flex-col items-center sm:items-start gap-1.5">
          <div class="away-glow">
            <img 
              v-if="awayLogo && !awayImgError" 
              :src="awayLogo" 
              :alt="game.away_name" 
              class="w-10 h-10 sm:w-12 sm:h-12 object-contain"
              @error="awayImgError = true"
            />
            <div v-else class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#0848a8]/12 border border-[#0848a8]/20 flex items-center justify-center">
              <span class="text-sm sm:text-base font-extrabold text-[#0848a8]/70 tracking-tight">{{ awayAbbr }}</span>
            </div>
          </div>
          <h1 class="text-xs sm:text-base font-semibold text-zinc-200 text-center sm:text-left leading-tight">{{ game.away_name }}</h1>
          <p v-if="sport === 'football' && game.away_formation" class="text-[10px] sm:text-xs text-zinc-500">
            {{ game.away_formation }}
          </p>
        </div>
      </div>

      <!-- Referee Info (football only) -->
      <div v-if="sport === 'football' && game.referee" class="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-edge/40">
        <div class="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
          <div class="flex items-center gap-1.5">
            <span class="text-zinc-500">Referee:</span>
            <span class="font-medium text-zinc-300">{{ game.referee.name }}</span>
          </div>
          <div class="h-3 w-px bg-edge/50 hidden sm:block"></div>
          <div class="flex items-center gap-1.5">
            <span class="text-zinc-500">Avg Yellow:</span>
            <span class="font-medium text-amber-500/80">{{ game.referee.avg_yellow_cards ? game.referee.avg_yellow_cards.toFixed(1) : 'N/A' }}</span>
          </div>
          <div class="h-3 w-px bg-edge/50 hidden sm:block"></div>
          <div class="flex items-center gap-1.5">
            <span class="text-zinc-500">Avg Red:</span>
            <span class="font-medium text-red-400/80">{{ game.referee.avg_red_cards ? game.referee.avg_red_cards.toFixed(2) : 'N/A' }}</span>
          </div>
          <div class="h-3 w-px bg-edge/50 hidden sm:block"></div>
          <div class="flex items-center gap-1.5">
            <span class="text-zinc-500">Avg Fouls:</span>
            <span class="font-medium text-zinc-400">{{ game.referee.avg_fouls ? game.referee.avg_fouls.toFixed(1) : 'N/A' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps({
  game: {
    type: Object,
    required: true
  },
  sport: {
    type: String,
    default: 'football'
  }
})

// Track image load errors to fall back to initials
const homeImgError = ref(false)
const awayImgError = ref(false)

// Reset errors when game changes
watch(() => props.game?.id, () => {
  homeImgError.value = false
  awayImgError.value = false
})

import { getTeamLogoUrl, teamAbbreviation } from '~/utils/teamLogo'

const homeLogo = computed(() => getTeamLogoUrl(props.game.home_key, props.game.league_key))
const awayLogo = computed(() => getTeamLogoUrl(props.game.away_key, props.game.league_key))

const homeAbbr = computed(() => teamAbbreviation(props.game.home_name))
const awayAbbr = computed(() => teamAbbreviation(props.game.away_name))

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

const formatTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  })
}
</script>

<style scoped>
.game-header-card {
  background: rgba(28, 31, 39, 0.9);
  border: 1px solid rgba(42, 47, 58, 0.4);
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.home-glow {
  filter: drop-shadow(0 0 12px rgba(248, 40, 40, 0.1));
}

.away-glow {
  filter: drop-shadow(0 0 12px rgba(8, 72, 168, 0.1));
}

.score-badge {
  background: linear-gradient(135deg, rgba(248, 40, 40, 0.08) 0%, rgba(8, 72, 168, 0.08) 100%);
  color: rgba(200, 200, 210, 0.7);
  border: 1px solid rgba(248, 40, 40, 0.06);
}
</style>
