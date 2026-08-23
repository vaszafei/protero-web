<template>
  <div class="space-y-4">
    <!-- Month Navigation -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-edge pb-3 sm:pb-4">
      <div>
        <h2 class="text-lg sm:text-2xl font-bold text-zinc-100">{{ currentMonthName }}</h2>
        <p class="text-xs sm:text-sm text-zinc-400">{{ monthStats.totalGames }} matches • {{ monthStats.predictions }} predictions</p>
      </div>
      <div class="flex gap-1.5 sm:gap-2">
        <button
          @click="changeMonth(-1)"
          class="px-3 sm:px-3 py-2 min-h-[44px] text-xs sm:text-sm font-medium text-zinc-300 bg-surface border border-edge rounded hover:bg-surface-light"
        >
          <span class="hidden sm:inline">Previous</span>
          <span class="sm:hidden">◀</span>
        </button>
        <button
          @click="goToCurrentMonth"
          class="px-3 sm:px-3 py-2 min-h-[44px] text-xs sm:text-sm font-medium text-zinc-300 bg-surface border border-edge rounded hover:bg-surface-light"
        >
          <span class="hidden sm:inline">Current Month</span>
          <span class="sm:hidden">Today</span>
        </button>
        <button
          @click="changeMonth(1)"
          class="px-3 sm:px-3 py-2 min-h-[44px] text-xs sm:text-sm font-medium text-zinc-300 bg-surface border border-edge rounded hover:bg-surface-light"
        >
          <span class="hidden sm:inline">Next</span>
          <span class="sm:hidden">▶</span>
        </button>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="calendar-card rounded-lg overflow-hidden">
      <!-- Weekday Headers -->
      <div class="grid grid-cols-7 border-b border-edge">
        <div
          v-for="(day, i) in weekDays"
          :key="day"
          class="px-1 sm:px-2 py-2 sm:py-3 text-center text-[11px] sm:text-xs font-semibold text-zinc-400 bg-surface-light"
        >
          <span class="hidden sm:inline">{{ day }}</span>
          <span class="sm:hidden">{{ shortWeekDays[i] }}</span>
        </div>
      </div>

      <!-- Calendar Days -->
      <div class="grid grid-cols-7">
        <div
          v-for="(day, index) in calendarDays"
          :key="index"
          class="min-h-[3.5rem] sm:min-h-36 border-b border-r border-edge/50 last:border-r-0 cursor-pointer hover:bg-surface-hover transition-colors"
          :class="{
            'bg-surface-base': !day.isCurrentMonth,
            'bg-[#f82828]/5 border-l-2 border-l-[#f82828]/30': day.isToday
          }"
          @click="openDayModal(day)"
        >
          <!-- Day Number -->
          <div class="px-1 sm:px-2 py-0.5 sm:py-1 border-b border-edge/50 flex items-center justify-between">
            <span
              class="text-[11px] sm:text-xs font-semibold"
              :class="{
                'text-zinc-600': !day.isCurrentMonth,
                'text-zinc-200': day.isCurrentMonth && !day.isToday,
                'text-[#f82828]': day.isToday
              }"
            >
              {{ day.dayNumber }}
            </span>
            <!-- Prediction & Bet Count Chips -->
            <div class="flex items-center gap-1">
              <span 
                v-if="day.predictionCount > 0" 
                class="px-1.5 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-400 rounded-full border border-emerald-200" 
                title="Predictions"
              >
                {{ day.predictionCount }}
              </span>
              <span 
                v-if="showBets && day.betCount > 0" 
                class="px-1.5 py-0.5 text-[11px] font-semibold bg-amber-500/20 text-amber-400 rounded-full border border-amber-200" 
                title="Bets"
              >
                {{ day.betCount }}
              </span>
            </div>
          </div>

          <!-- League Game Counts (truncated) -->
          <div class="p-0.5 sm:p-1 space-y-0.5 sm:space-y-1">
            <div
              v-for="leagueCount in day.leagueCounts.slice(0, 4)"
              :key="leagueCount.key"
              class="flex items-center justify-between text-[11px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded"
              :class="{
                'bg-emerald-500/20': leagueCount.predictions > 0,
                'bg-surface-light': leagueCount.predictions === 0
              }"
            >
              <span class="hidden sm:flex items-center gap-1 truncate flex-1">
                <img
                  v-if="getLeagueLogoUrl(leagueCount.key)"
                  :src="getLeagueLogoUrl(leagueCount.key)"
                  loading="lazy"
                  width="12" height="12"
                  class="w-3 h-3 object-contain flex-shrink-0"
                  :alt="leagueCount.name"
                  @error="($event.target as HTMLImageElement).style.display='none'"
                />
                <span class="text-zinc-300 truncate">{{ leagueCount.name }}</span>
              </span>
              <span class="font-semibold text-zinc-200 ml-0 sm:ml-1 text-[11px] sm:text-xs">{{ leagueCount.count }}</span>
            </div>
            <div
              v-if="day.leagueCounts.length > 4"
              class="text-[10px] text-zinc-500 text-center px-1 py-0.5"
            >
              +{{ day.leagueCounts.length - 4 }} more
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex items-center gap-4 text-xs text-zinc-400">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 bg-emerald-500/20 border border-emerald-500/30 rounded"></div>
        <span>With Prediction</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 bg-surface-light border border-edge rounded"></div>
        <span>No Prediction</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 bg-[#f82828]/8 border-l-2 border-l-[#f82828]/30 rounded"></div>
        <span>Today</span>
      </div>
      <span class="text-zinc-500 ml-2">Click on a day to view all matches</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  games: any[]
  predictions?: any[]
  leagues: any[]
  bets?: any[]
  parlays?: any[]
  showBets?: boolean
}>()

import { getLeagueLogoUrl } from '~/utils/teamLogo'

const emit = defineEmits<{
  'select-game': [game: any]
  'select-day': [day: any]
}>()

const currentMonth = ref(new Date())
const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const shortWeekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const openDayModal = (day: any) => {
  if (day.games.length > 0) {
    emit('select-day', day)
  }
}

// Current month name
const currentMonthName = computed(() => {
  return currentMonth.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

// Go to current month
const goToCurrentMonth = () => {
  currentMonth.value = new Date()
}

// Change month
const changeMonth = (direction: number) => {
  const newDate = new Date(currentMonth.value)
  newDate.setMonth(newDate.getMonth() + direction)
  currentMonth.value = newDate
}

// Format time
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Month statistics
const monthStats = computed(() => {
  const monthStart = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1)
  const monthEnd = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 0)
  
  const monthGames = props.games.filter(game => {
    const gameDate = new Date(game.date)
    return gameDate >= monthStart && gameDate <= monthEnd
  })
  
  const predictions = monthGames.filter(game => 
    props.predictions?.some(p => p.game_id === game.id)
  ).length
  
  return {
    totalGames: monthGames.length,
    predictions
  }
})

// Calendar days array
const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  
  // First day of the month
  const firstDay = new Date(year, month, 1)
  const firstDayOfWeek = firstDay.getDay()
  
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  
  // Previous month days to fill the grid
  const prevMonthLastDay = new Date(year, month, 0)
  const daysFromPrevMonth = firstDayOfWeek
  
  // Next month days to fill the grid
  const totalDays = Math.ceil((daysFromPrevMonth + daysInMonth) / 7) * 7
  const daysFromNextMonth = totalDays - (daysFromPrevMonth + daysInMonth)
  
  const days: any[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Add previous month days
  for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthLastDay.getDate() - i)
    const dayGames = getGamesForDate(date)
    days.push({
      date,
      dayNumber: date.getDate(),
      isCurrentMonth: false,
      isToday: false,
      games: dayGames,
      leagueCounts: getLeagueCounts(dayGames),
      predictionCount: dayGames.filter(g => g.predictions && g.predictions.length > 0).length,
      betCount: props.showBets ? dayGames.filter(g => g.bets && g.bets.length > 0).length : 0
    })
  }
  
  // Add current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i)
    const isToday = date.getTime() === today.getTime()
    const dayGames = getGamesForDate(date)
    days.push({
      date,
      dayNumber: i,
      isCurrentMonth: true,
      isToday,
      games: dayGames,
      leagueCounts: getLeagueCounts(dayGames),
      predictionCount: dayGames.filter(g => g.predictions && g.predictions.length > 0).length,
      betCount: props.showBets ? dayGames.filter(g => g.bets && g.bets.length > 0).length : 0
    })
  }
  
  // Add next month days
  for (let i = 1; i <= daysFromNextMonth; i++) {
    const date = new Date(year, month + 1, i)
    const dayGames = getGamesForDate(date)
    days.push({
      date,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: false,
      games: dayGames,
      leagueCounts: getLeagueCounts(dayGames),
      predictionCount: dayGames.filter(g => g.predictions && g.predictions.length > 0).length,
      betCount: props.showBets ? dayGames.filter(g => g.bets && g.bets.length > 0).length : 0
    })
  }
  
  return days
})

// Memoized date → games lookup (built once per games array change)
const gamesDateMap = computed(() => {
  const map = new Map<string, any[]>()
  for (const game of props.games) {
    if (!game.date) continue
    const dateStr = game.date.split('T')[0]
    if (!map.has(dateStr)) map.set(dateStr, [])
    map.get(dateStr)!.push(game)
  }
  // Sort each day's games by time
  for (const [, dayGames] of map) {
    dayGames.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }
  return map
})

// Get games for a specific date (uses memoized map)
const getGamesForDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`
  return gamesDateMap.value.get(dateStr) || []
}

// Get league counts for a day's games
const getLeagueCounts = (games: any[]) => {
  const counts = new Map<string, { count: number, predictions: number, flag: string, name: string }>()
  
  games.forEach(game => {
    const key = game.league_key
    if (!counts.has(key)) {
      const league = props.leagues.find(l => l.key === key)
      counts.set(key, {
        count: 0,
        predictions: 0,
        flag: league?.flag || '⚽',
        name: league?.name || key
      })
    }
    const entry = counts.get(key)!
    entry.count++
    if (game.prediction) {
      entry.predictions++
    }
  })
  
  return Array.from(counts.entries())
    .map(([key, data]) => ({ key, ...data }))
    .sort((a, b) => b.count - a.count)
}
</script>

<style scoped>
.calendar-card {
  background: rgba(28, 31, 39, 0.9);
  border: 1px solid rgba(42, 47, 58, 0.4);
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.02);
}
</style>
