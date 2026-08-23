<template>
  <div class="timeline-h">
    <!-- horizontal scroll rail -->
    <div class="tl-scroll">
      <div class="tl-track">
        <template v-for="(event, index) in sortedEvents" :key="index">
          <div class="tl-node" :style="{ animationDelay: `${index * 30}ms` }">
            <!-- home events sit above the spine -->
            <div class="tl-slot tl-slot-top">
              <div v-if="isHome(event)" class="tl-card tl-card-home">
                <span class="tl-player">{{ event.player }}</span>
                <span class="tl-type">{{ getEventLabel(event.type) }}</span>
              </div>
            </div>

            <!-- the spine point -->
            <div class="tl-dot-wrap">
              <span class="tl-dot" :class="[isHome(event) ? 'tl-dot-home' : 'tl-dot-away', dotTone(event)]">
                <UIcon :name="dotIcon(event)" class="tl-icon" />
              </span>
            </div>

            <!-- away events sit below the spine -->
            <div class="tl-slot tl-slot-bottom">
              <div v-if="!isHome(event)" class="tl-card tl-card-away">
                <span class="tl-player">{{ event.player }}</span>
                <span class="tl-type">{{ getEventLabel(event.type) }}</span>
              </div>
            </div>

            <!-- minute tick -->
            <div class="tl-minute">
              {{ typeof event.minute === 'string' ? event.minute : event.minute + "'" }}
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- legend -->
    <div class="tl-legend">
      <span class="tl-legend-chip" :style="homeChip">
        <span class="tl-legend-dot" :style="{ background: VIZ_HOME }" />
        {{ homeName }}
      </span>
      <span class="tl-legend-chip" :style="awayChip">
        <span class="tl-legend-dot" :style="{ background: VIZ_AWAY }" />
        {{ awayName }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { VIZ_HOME, VIZ_AWAY } from '~/utils/viz'

const props = defineProps({
  events: {
    type: Array,
    required: true
  },
  homeName: {
    type: String,
    required: true
  },
  awayName: {
    type: String,
    required: true
  },
  homeLineup: {
    type: Array,
    default: () => []
  },
  awayLineup: {
    type: Array,
    default: () => []
  }
})

const homeChip = { borderColor: `${VIZ_HOME}55`, color: VIZ_HOME }
const awayChip = { borderColor: `${VIZ_AWAY}55`, color: VIZ_AWAY }

const normalizePlayerName = (name) => {
  return (name || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const homePlayerNames = computed(() => {
  return props.homeLineup.map(p => normalizePlayerName(p.player_name || p.name || ''))
})

const awayPlayerNames = computed(() => {
  return props.awayLineup.map(p => normalizePlayerName(p.player_name || p.name || ''))
})

// Validate team assignment based on lineup data
const getValidatedTeam = (event) => {
  const normalizedEventPlayer = normalizePlayerName(event.player)
  const isInHomeTeam = homePlayerNames.value.some(name =>
    name.includes(normalizedEventPlayer) || normalizedEventPlayer.includes(name))
  const isInAwayTeam = awayPlayerNames.value.some(name =>
    name.includes(normalizedEventPlayer) || normalizedEventPlayer.includes(name))
  if (isInHomeTeam) return 'home'
  if (isInAwayTeam) return 'away'
  if (event.isHome === true || event.isHome === 'true') return 'home'
  if (event.isHome === false || event.isHome === 'false') return 'away'
  return event.team || 'home'
}

const isHome = (event) => getValidatedTeam(event) === 'home'

const sortedEvents = computed(() => {
  return [...props.events].sort((a, b) => {
    const minuteA = typeof a.minute === 'string' ? parseInt(a.minute.replace(/['+]/g, '')) : parseInt(a.minute) || 0
    const minuteB = typeof b.minute === 'string' ? parseInt(b.minute.replace(/['+]/g, '')) : parseInt(b.minute) || 0
    return minuteA - minuteB
  })
})

const getEventLabel = (type) => {
  const labels = {
    goal: 'Goal',
    penalty_goal: 'Penalty Goal',
    'penalty-goal': 'Penalty Goal',
    yellow_card: 'Yellow Card',
    'yellow-card': 'Yellow Card',
    red_card: 'Red Card',
    'red-card': 'Red Card',
    substitution: 'Substitution',
    var: 'VAR Decision',
    penalty_missed: 'Penalty Missed',
    'penalty-missed': 'Penalty Missed',
    own_goal: 'Own Goal',
    'own-goal': 'Own Goal'
  }
  return labels[type] || type
}

// Icon names from the heroicons set (Nuxt UI, CD #2) — no emoji, no inline SVG.
const dotIcon = (event) => {
  const t = String(event.type || '').toLowerCase()
  if (t === 'own_goal' || t === 'own-goal') return 'i-heroicons-arrow-trending-up'
  if (t.includes('goal') || t.includes('penalty')) return 'i-heroicons-bolt'
  if (t.includes('red')) return 'i-heroicons-stop'
  if (t.includes('yellow')) return 'i-heroicons-square-2-stack'
  if (t.includes('sub')) return 'i-heroicons-arrow-path'
  if (t.includes('var')) return 'i-heroicons-tv'
  return 'i-heroicons-minus'
}

// Yellow cards render as a filled amber dot; goals stay team-coloured.
const dotTone = (event) => {
  const t = String(event.type || '').toLowerCase()
  if (t.includes('yellow')) return 'tl-dot-yellow'
  if (t.includes('red')) return 'tl-dot-red'
  return ''
}
</script>

<style scoped>
.timeline-h {
  --slot-h: 54px;
  --dot-h: 22px;
}

.tl-scroll {
  overflow-x: auto;
  overflow-y: visible;
  padding: 0 0.25rem 0.25rem;
  scrollbar-width: thin;
  scrollbar-color: #2a2f3a transparent;
}

.tl-track {
  position: relative;
  display: flex;
  align-items: flex-start;
  min-width: max-content;
  padding: 0 0.5rem;
}

/* continuous spine — a single gradient line behind every node */
.tl-track::before {
  content: '';
  position: absolute;
  left: 0.5rem;
  right: 0.5rem;
  top: calc(var(--slot-h) + var(--dot-h) / 2);
  height: 2px;
  transform: translateY(-50%);
  background: linear-gradient(90deg,
    rgba(57, 135, 229, 0) 0%,
    rgba(57, 135, 229, 0.28) 12%,
    #2e3440 50%,
    rgba(217, 89, 38, 0.28) 88%,
    rgba(217, 89, 38, 0) 100%);
}

.tl-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 72px;
  flex-shrink: 0;
  animation: tl-rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.tl-slot {
  display: flex;
  justify-content: center;
  width: 100%;
  height: var(--slot-h);
}
.tl-slot-top { align-items: flex-end; padding-bottom: 0.4rem; }
.tl-slot-bottom { align-items: flex-start; padding-top: 0.4rem; }

.tl-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0.32rem 0.5rem 0.32rem 0.65rem;
  border-radius: 0.5rem;
  border: 1px solid;
  min-width: 54px;
  max-width: 88px;
  transition: transform 140ms ease, box-shadow 140ms ease;
  text-align: left;
}
.tl-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 7px;
  bottom: 7px;
  width: 3px;
  border-radius: 2px;
}
.tl-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}
.tl-card-home {
  background: linear-gradient(180deg, rgba(57, 135, 229, 0.16), rgba(57, 135, 229, 0.05));
  border-color: rgba(57, 135, 229, 0.32);
}
.tl-card-home::before { background: #3987e5; }
.tl-card-away {
  background: linear-gradient(180deg, rgba(217, 89, 38, 0.16), rgba(217, 89, 38, 0.05));
  border-color: rgba(217, 89, 38, 0.32);
}
.tl-card-away::before { background: #d95926; }

.tl-player {
  font-size: 0.6rem;
  font-weight: 700;
  color: #f4f4f5;
  max-width: 74px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.15;
}
.tl-type {
  font-size: 0.5rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #a1a1aa;
  max-width: 74px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.tl-dot-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--dot-h);
  position: relative;
  z-index: 1;
}
.tl-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #1c1f27;
  box-shadow: 0 0 0 1.5px rgba(42, 47, 58, 0.9), 0 2px 6px rgba(0, 0, 0, 0.45);
  transition: transform 140ms ease;
}
.tl-node:hover .tl-dot {
  transform: scale(1.12);
}
.tl-icon {
  width: 11px;
  height: 11px;
}
.tl-dot-home { background: #3987e5; color: #fff; }
.tl-dot-away { background: #d95926; color: #fff; }
.tl-dot-yellow { background: #f59e0b; color: #fff; }
.tl-dot-red { background: #ef4444; color: #fff; }

.tl-minute {
  height: 18px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  font-size: 0.5625rem;
  font-weight: 700;
  color: #8c8f98;
  font-variant-numeric: tabular-nums;
}

/* legend */
.tl-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #2a2f3a;
}
.tl-legend-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  border: 1px solid;
  font-size: 0.7rem;
  font-weight: 600;
}
.tl-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

@keyframes tl-rise {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .tl-node { animation: none; }
  .tl-card, .tl-dot { transition: none; }
}
</style>
