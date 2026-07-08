<template>
  <div class="space-y-3">
    <!-- Month / year label + nav arrows -->
    <div class="flex items-center justify-between px-1">
      <button @click="shiftWeek(-7)" class="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-surface-light active:bg-surface-hover transition-colors">
        <ChevronLeft :size="18" class="text-zinc-400" />
      </button>
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-zinc-200">{{ monthLabel }}</span>
        <button
          v-if="selectedDateStr !== todayStr"
          @click="jumpToToday"
          class="px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded-md bg-[#f82828]/10 text-[#f82828] border border-[#f82828]/30 hover:bg-[#f82828]/20 transition-colors"
        >
          Today
        </button>
      </div>
      <button @click="shiftWeek(7)" class="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-surface-light active:bg-surface-hover transition-colors">
        <ChevronRight :size="18" class="text-zinc-400" />
      </button>
    </div>

    <!-- Horizontal scrollable date pills -->
    <div ref="scrollContainer" class="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory -mx-1 px-1">
      <button
        v-for="day in dateRange"
        :key="day.dateStr"
        :ref="(el: any) => { if (day.isToday) todayEl = el as HTMLElement }"
        @click="selectDate(day)"
        class="flex flex-col items-center justify-center flex-shrink-0 w-[3.25rem] min-h-[44px] py-2 rounded-xl transition-all snap-center"
        :class="[
          day.dateStr === selectedDateStr
            ? 'date-pill-active text-white shadow-md scale-105'
            : day.isToday
              ? 'bg-[#f82828]/10 text-[#f82828] border border-[#f82828]/25'
              : day.gameCount > 0
                ? 'bg-surface text-zinc-200 border border-edge'
                : 'bg-surface-base text-zinc-500',
        ]"
      >
        <span class="text-[11px] font-medium uppercase leading-none" :class="day.dateStr === selectedDateStr ? 'text-white/70' : ''">
          {{ day.weekDay }}
        </span>
        <span class="text-lg font-bold leading-tight mt-0.5">{{ day.dayNumber }}</span>
        <!-- Game count dot(s) -->
        <div class="flex items-center gap-0.5 mt-0.5 h-2">
          <span
            v-if="day.gameCount > 0"
            class="text-[11px] font-bold leading-none"
            :class="day.dateStr === selectedDateStr ? 'text-white/80' : 'text-primary-500'"
          >{{ day.gameCount }}</span>
        </div>
      </button>
    </div>

    <!-- Selected day games -->
    <div v-if="selectedDayData">
      <DayMatchesPanel
        :key="selectedDayData.date?.getTime() || 0"
        :date="selectedDayData.date"
        :games="selectedDayData.games"
        :leagues="leagues"
        :bets="bets"
        :parlays="parlays"
        :show-bets="showBets"
      />
    </div>
    <div v-else class="bg-surface border border-edge rounded-lg p-6 text-center text-zinc-500">
      <p class="text-sm font-medium">No matches on this day</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import DayMatchesPanel from './DayMatchesPanel.vue'
import { toAthensDateStr, todayAthensStr } from '~/utils/dateTime'

const props = defineProps<{
  games: any[]
  predictions?: any[]
  leagues: any[]
  bets?: any[]
  parlays?: any[]
  showBets?: boolean
}>()

const emit = defineEmits<{
  'select-day': [day: any]
}>()

const scrollContainer = ref<HTMLElement | null>(null)
const todayEl = ref<HTMLElement | null>(null)

// Range centre — starts at today, shifts when user taps arrows
const rangeAnchor = ref(new Date())

// How many days to show either side of the anchor
const RANGE_DAYS = 21 // ±21 days = 6 weeks of scrollable dates

// Selected date string (YYYY-MM-DD in Europe/Athens)
const todayStr = todayAthensStr()
// toDateStr: converts any Date to the Athens calendar date string
const toDateStr = (d: Date) => toAthensDateStr(d)
const selectedDateStr = ref(todayStr)

// Build date range array
const dateRange = computed(() => {
  const anchor = new Date(rangeAnchor.value)
  anchor.setHours(0, 0, 0, 0)
  const days: any[] = []

  for (let i = -RANGE_DAYS; i <= RANGE_DAYS; i++) {
    const d = new Date(anchor)
    d.setDate(d.getDate() + i)
    const dateStr = toDateStr(d)
    const dayGames = getGamesForDate(d)

    days.push({
      date: new Date(d),
      dateStr,
      dayNumber: d.getDate(),
      weekDay: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
      isToday: dateStr === todayStr,
      gameCount: dayGames.length,
      games: dayGames,
    })
  }
  return days
})

// Month label based on selected date (shown in Athens time)
const monthLabel = computed(() => {
  const sel = dateRange.value.find(d => d.dateStr === selectedDateStr.value)
  if (sel) return sel.date.toLocaleDateString('en-US', { timeZone: 'Europe/Athens', month: 'long', year: 'numeric' })
  return rangeAnchor.value.toLocaleDateString('en-US', { timeZone: 'Europe/Athens', month: 'long', year: 'numeric' })
})

// The full day data object for the selected date
const selectedDayData = computed(() => {
  const day = dateRange.value.find(d => d.dateStr === selectedDateStr.value)
  if (!day || day.games.length === 0) return null
  return {
    date: day.date,
    dayNumber: day.dayNumber,
    isCurrentMonth: true,
    isToday: day.isToday,
    games: day.games,
  }
})

// Shift the visible range by N days
const shiftWeek = (days: number) => {
  const d = new Date(rangeAnchor.value)
  d.setDate(d.getDate() + days)
  rangeAnchor.value = d
}

// Select a date
const selectDate = (day: any) => {
  selectedDateStr.value = day.dateStr
  if (day.games.length > 0) {
    emit('select-day', {
      date: day.date,
      dayNumber: day.dayNumber,
      isCurrentMonth: true,
      isToday: day.isToday,
      games: day.games,
    })
  }
}

// Jump back to today: reset anchor + select today + scroll into view
const jumpToToday = async () => {
  rangeAnchor.value = new Date()
  selectedDateStr.value = todayStr
  await nextTick()
  const todayDay = dateRange.value.find(d => d.isToday)
  if (todayDay) {
    emit('select-day', {
      date: todayDay.date,
      dayNumber: todayDay.dayNumber,
      isCurrentMonth: true,
      isToday: true,
      games: todayDay.games,
    })
  }
  if (todayEl.value && scrollContainer.value) {
    const el = todayEl.value as HTMLElement
    const container = scrollContainer.value
    const offset = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2
    container.scrollTo({ left: offset, behavior: 'smooth' })
  }
}

// Get games for a specific date — compare in Athens timezone so NBA late-night
// games (e.g. 23:30 UTC = 02:30 Athens next day) appear on the correct Athens date.
const getGamesForDate = (date: Date) => {
  const dateStr = toDateStr(date)
  return props.games
    .filter(game => {
      if (!game.date) return false
      return toAthensDateStr(game.date) === dateStr
    })
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

// Scroll today into view on mount
onMounted(async () => {
  await nextTick()
  if (todayEl.value && scrollContainer.value) {
    const el = todayEl.value as HTMLElement
    const container = scrollContainer.value
    const offset = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2
    container.scrollTo({ left: offset, behavior: 'smooth' })
  }

  // Auto-select today if it has games
  const todayDay = dateRange.value.find(d => d.isToday)
  if (todayDay && todayDay.games.length > 0) {
    emit('select-day', {
      date: todayDay.date,
      dayNumber: todayDay.dayNumber,
      isCurrentMonth: true,
      isToday: true,
      games: todayDay.games,
    })
  }
})
</script>

<style scoped>
.date-pill-active {
  background: linear-gradient(135deg, rgba(248, 40, 40, 0.7) 0%, rgba(8, 72, 168, 0.7) 100%);
  border: 1px solid rgba(248, 40, 40, 0.3);
}
</style>
