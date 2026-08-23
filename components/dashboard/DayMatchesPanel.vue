<template>
  <div class="matches-panel overflow-hidden">
    <!-- Panel Header -->
    <div class="panel-header px-4 py-2.5 flex items-center justify-between">
      <div class="text-sm text-zinc-100 font-semibold">{{ fullDate }} • <span class="text-zinc-400">{{ games.length }} match{{ games.length !== 1 ? 'es' : '' }}</span></div>
      
      <!-- View Toggle Button -->
      <div v-if="dayParlays.length > 0" class="flex items-center gap-1 bg-surface/60 rounded-full p-0.5 border border-edge/40">
        <button
          @click="viewMode = 'games'"
          :class="[
            'px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-full transition-all',
            viewMode === 'games' 
              ? 'toggle-active text-white' 
              : 'text-zinc-400 hover:text-zinc-200'
          ]"
        >
          Games
        </button>
        <button
          @click="viewMode = 'parlays'"
          :class="[
            'px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-full transition-all',
            viewMode === 'parlays' 
              ? 'toggle-active text-white' 
              : 'text-zinc-400 hover:text-zinc-200'
          ]"
        >
          Parlays ({{ dayParlays.length }})
        </button>
      </div>
    </div>

    <!-- Games by League -->
    <div v-show="viewMode === 'games'" class="p-2 space-y-2">
      <div v-for="league in Object.keys(gamesByLeague)" :key="league" class="league-card rounded-lg overflow-hidden">
        <!-- League Header - Clickable -->
        <div 
          class="league-header flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
          @click="toggleLeague(league)"
        >
          <img
            v-if="getLeagueLogoUrl(league)"
            :src="getLeagueLogoUrl(league)"
            loading="lazy"
            width="16" height="16"
            class="w-4 h-4 object-contain flex-shrink-0"
            :alt="getLeagueName(league)"
            @error="($event.target as HTMLImageElement).style.display='none'"
          />
          <span class="font-semibold text-zinc-200 text-[13px] flex-1 truncate">{{ getLeagueName(league) }}</span>
          <!-- Quick stats chips -->
          <span 
            v-if="getLeaguePredictionCount(league) > 0"
            class="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold rounded-full"
          >
            {{ getLeaguePredictionCount(league) }}
          </span>
          <span 
            v-if="getLeagueBetCount(league) > 0"
            class="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 text-[10px] font-bold rounded-full"
          >
            {{ getLeagueBetCount(league) }}
          </span>
          <span class="text-[11px] text-zinc-500 font-medium tabular-nums flex-shrink-0">{{ gamesByLeague[league].length }}</span>
          <UIcon
            class="w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 flex-shrink-0"
            :class="{ 'rotate-90': expandedLeagues[league] }"
            name="i-heroicons-chevron-right"
          />
        </div>

        <!-- League Games - Expandable -->
        <div v-show="expandedLeagues[league]" class="bg-surface/50">
          <div class="p-1.5 space-y-1">
            <div
              v-for="game in gamesByLeague[league]"
              :key="game.id"
              class="game-row rounded-md hover:bg-surface-light/70 transition-colors cursor-pointer overflow-hidden"
              @click="navigateToGame(game.id)"
            >
              <!-- Top status bar -->
              <div class="flex items-center justify-between px-2.5 py-0.5">
                <span class="text-[10px] font-medium text-zinc-500">{{ formatTime(game.date) }}</span>
                <div class="flex items-center gap-1">
                  <span v-if="game.home_goals !== null" class="text-[10px] font-bold text-zinc-500">FT</span>
                </div>
              </div>

              <!-- Main row: Teams+Scores | Divider | Odds -->
              <div class="flex items-stretch px-2.5 pb-1.5">
                <!-- LEFT: Teams + Scores -->
                <div class="flex flex-col justify-center gap-0.5 flex-1 min-w-0">
                  <!-- Home -->
                  <div class="flex items-center gap-1.5">
                    <img v-if="getTeamLogoUrl(game.home_key)" :src="getTeamLogoUrl(game.home_key)" loading="lazy" width="14" height="14" class="w-3.5 h-3.5 object-contain flex-shrink-0" :alt="game.home_name" @error="($event.target as HTMLImageElement).style.display='none'" />
                    <div v-else class="w-3.5 h-3.5 rounded-full bg-[#0848a8]/20 flex-shrink-0"></div>
                    <span class="text-[11px] font-semibold text-zinc-200 truncate flex-1">{{ game.home_name }}</span>
                    <span v-if="game.home_goals !== null" class="text-[13px] font-bold text-zinc-100 tabular-nums w-6 text-right">{{ game.home_goals }}</span>
                  </div>
                  <!-- Away -->
                  <div class="flex items-center gap-1.5">
                    <img v-if="getTeamLogoUrl(game.away_key)" :src="getTeamLogoUrl(game.away_key)" loading="lazy" width="14" height="14" class="w-3.5 h-3.5 object-contain flex-shrink-0" :alt="game.away_name" @error="($event.target as HTMLImageElement).style.display='none'" />
                    <div v-else class="w-3.5 h-3.5 rounded-full bg-[#f82828]/15 flex-shrink-0"></div>
                    <span class="text-[11px] font-semibold text-zinc-200 truncate flex-1">{{ game.away_name }}</span>
                    <span v-if="game.away_goals !== null" class="text-[13px] font-bold text-zinc-100 tabular-nums w-6 text-right">{{ game.away_goals }}</span>
                  </div>
                </div>

                <!-- DIVIDER -->
                <div v-if="getOdds(game)" class="w-px bg-edge/40 mx-2.5 self-stretch"></div>

                <!-- RIGHT: Odds columns -->
                <div v-if="getOdds(game)" class="flex items-center gap-2 flex-shrink-0">
                  <!-- Moneyline -->
                  <div v-if="getOdds(game)?.moneyline" class="flex flex-col items-center gap-0.5">
                    <span class="text-[8px] text-zinc-600 uppercase font-medium leading-none">ML</span>
                    <span :class="['text-[10px] font-semibold tabular-nums px-0.5 rounded transition-all', getOddsHighlight(game, 'home')]">{{ getOdds(game).moneyline.home?.toFixed(2) }}</span>
                    <span :class="['text-[10px] font-semibold tabular-nums px-0.5 rounded transition-all', getOddsHighlight(game, 'away')]">{{ getOdds(game).moneyline.away?.toFixed(2) }}</span>
                  </div>
                  <!-- Spread -->
                  <div v-if="getOdds(game)?.handicap?.line" class="flex flex-col items-center gap-0.5">
                    <span class="text-[8px] text-zinc-600 uppercase font-medium leading-none">SPR</span>
                    <span :class="['text-[10px] font-semibold tabular-nums px-0.5 rounded transition-all', getOddsHighlight(game, 'spread')]">{{ getOdds(game).handicap.line > 0 ? '+' : '' }}{{ getOdds(game).handicap.line }}</span>
                    <span :class="['text-[10px] font-semibold tabular-nums px-0.5 rounded transition-all', getOddsHighlight(game, 'spread')]">{{ getOdds(game).handicap.line > 0 ? '' : '+' }}{{ -(getOdds(game).handicap.line) }}</span>
                  </div>
                  <!-- O/U -->
                  <div v-if="getOdds(game)?.over_under?.line" class="flex flex-col items-center gap-0.5">
                    <span class="text-[8px] text-zinc-600 uppercase font-medium leading-none">O/U</span>
                    <span :class="['text-[10px] font-semibold tabular-nums px-0.5 rounded transition-all', getOddsHighlight(game, 'over')]">O {{ getOdds(game).over_under.line }}</span>
                    <span :class="['text-[10px] font-semibold tabular-nums px-0.5 rounded transition-all', getOddsHighlight(game, 'under')]">U {{ getOdds(game).over_under.line }}</span>
                  </div>
                </div>

                <!-- Fallback: show odds_home/odds_away if no sport_stats -->
                <template v-else-if="game.odds_home">
                  <div class="w-px bg-edge/40 mx-2.5 self-stretch"></div>
                  <div class="flex flex-col items-center justify-center gap-0.5 flex-shrink-0">
                    <span class="text-[8px] text-zinc-600 uppercase font-medium leading-none">ML</span>
                    <span class="text-[10px] font-semibold text-zinc-300 tabular-nums">{{ game.odds_home?.toFixed(2) }}</span>
                    <span class="text-[10px] font-semibold text-zinc-300 tabular-nums">{{ game.odds_away?.toFixed(2) }}</span>
                  </div>
                </template>
              </div>

              <!-- Bet picks row (real placed bets) -->
              <div v-if="getGameBets(game).length > 0" class="px-2.5 pb-1.5 flex flex-wrap gap-1 border-t border-edge/20 pt-1">
                <div
                  v-for="bet in getGameBets(game)"
                  :key="bet.id"
                  :class="[
                    'flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold',
                    bet.status === 'won' ? 'bg-emerald-500/15 text-emerald-400' :
                    bet.status === 'lost' ? 'bg-red-500/15 text-red-400' :
                    'bg-amber-500/10 text-amber-400'
                  ]"
                >
                  <span class="font-bold">{{ formatBetType(bet) }}</span>
                  <span class="text-zinc-500">@</span>
                  <span>{{ Number(bet.odds).toFixed(2) }}</span>
                  <span class="text-zinc-500">•</span>
                  <span>€{{ Number(bet.stake).toFixed(1) }}</span>
                  <span v-if="bet.status === 'won'" class="text-emerald-400">W</span>
                  <span v-else-if="bet.status === 'lost'" class="text-red-400">L</span>
                </div>
              </div>

              <!-- Prediction chip (only when no bet exists for this game) -->
              <div
                v-else-if="getPredictionChip(game)"
                class="px-2.5 pb-1.5 flex flex-wrap gap-1 border-t border-edge/20 pt-1"
              >
                <div class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  <span class="font-bold">{{ getPredictionChip(game)?.label }}</span>
                  <span v-if="getPredictionChip(game)?.ev != null" class="text-blue-400/70">•</span>
                  <span v-if="getPredictionChip(game)?.ev != null" class="text-emerald-400">EV {{ getPredictionChip(game)?.ev }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="games.length === 0" class="text-center py-12 px-4">
        <p class="text-zinc-500">No matches scheduled for this day</p>
      </div>
    </div>

    <!-- Parlays View -->
    <div v-show="viewMode === 'parlays'" class="p-2 space-y-2">
      <div v-if="dayParlays.length === 0" class="text-center py-8 text-zinc-500">
        <p>No parlays for this day</p>
      </div>
      
      <div v-for="parlay in dayParlays" :key="parlay.id" class="border border-edge/40 rounded-lg overflow-hidden">
        <!-- Parlay Header - Clickable -->
        <div 
          class="flex items-center justify-between px-3 py-2 bg-surface-light/50 hover:bg-surface-light cursor-pointer transition-colors"
          @click="toggleParlay(parlay.id)"
        >
          <div class="flex items-center gap-2 flex-1">
            <UIcon 
              class="w-4 h-4 text-zinc-400 transition-transform duration-200"
              :class="{ 'rotate-90': expandedParlayIds[parlay.id] }"
              name="i-heroicons-chevron-right"
            />
            <div>
              <div class="font-semibold text-zinc-100 text-sm">Parlay #{{ parlay.id }}</div>
              <div class="text-xs text-zinc-500">{{ parlay.num_legs || 0 }} legs • {{ parlay.parlay_odds?.toFixed(2) || '0.00' }}x • €{{ parlay.total_stake?.toFixed(2) || '0.00' }}</div>
            </div>
          </div>
          
          <!-- Status badge -->
          <span 
            class="px-2 py-0.5 rounded text-[11px] font-bold"
            :class="{
              'bg-green-500/20 text-green-400': parlay.status === 'won',
              'bg-red-500/20 text-red-400': parlay.status === 'lost',
              'bg-zinc-700 text-zinc-300': parlay.status === 'pending'
            }"
          >
            {{ parlay.status.toUpperCase() }}
          </span>
        </div>

        <!-- Parlay Legs (Expanded) -->
        <div v-if="expandedParlayIds[parlay.id]" class="p-2 space-y-2 bg-surface/50">
          <div 
            v-for="(leg, legIndex) in parlay.parlay_legs"
            :key="leg.id"
            v-show="true"
            class="flex items-center gap-2 px-3 py-1.5 bg-surface-light/40 border border-edge/30 rounded text-[11px]"
          >
            <!-- Leg Badge -->
            <span class="px-1.5 py-0.5 bg-purple-500/15 text-purple-400 font-bold rounded text-[11px] whitespace-nowrap">Leg {{ legIndex + 1 }}</span>
            
            <!-- Game Teams -->
            <div v-if="getLegGameName(leg)" class="flex items-center gap-1 flex-1 min-w-0">
              <span class="font-semibold text-zinc-100 truncate">{{ getLegGameName(leg).home }}</span>
              <span class="text-zinc-500">vs</span>
              <span class="font-semibold text-zinc-100 truncate">{{ getLegGameName(leg).away }}</span>
            </div>
            <div v-else class="text-zinc-500">Game not found</div>
            
            <!-- Bet Type Chip -->
            <span class="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 font-semibold rounded text-[11px] whitespace-nowrap">{{ leg.bets?.bet_type }}</span>
            
            <!-- Odds Chip -->
            <span class="px-1.5 py-0.5 bg-zinc-700 text-zinc-300 font-semibold rounded text-[11px] whitespace-nowrap">{{ leg.bets?.odds }}x</span>
          </div>
        </div>

        <!-- Parlay Result Footer -->
        <div v-if="expandedParlayIds[parlay.id]" class="px-3 py-2 bg-surface/50 border-t border-edge/30 text-[11px]">
          <div v-if="parlay.status !== 'pending'" class="flex justify-between items-center">
            <span class="text-zinc-400">{{ parlay.status === 'won' ? 'Won' : 'Lost' }}</span>
            <span 
              class="font-bold"
              :class="parlay.status === 'won' ? 'text-green-400' : 'text-red-400'"
            >
              {{ parlay.status === 'won' ? '+' : '-' }}€{{ parlay.status === 'won' ? ((parlay.actual_payout || 0) - (parlay.total_stake || 0)).toFixed(2) : (parlay.total_stake || 0).toFixed(2) }}
            </span>
          </div>
          <div v-else class="flex justify-between items-center">
            <span class="text-zinc-400">Potential Win</span>
            <span class="font-bold text-zinc-100">€{{ ((parlay.total_stake || 0) * (parlay.parlay_odds || 0)).toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { betLabelShort } from '~/utils/bet-label'

const LEAGUE_EXPAND_KEY = 'dashboard:expandedLeagues'

const props = defineProps<{
  date: Date | null
  games: any[]
  leagues: any[]
  bets?: any[]
  parlays?: any[]
  showBets?: boolean
}>()

// Restore persisted expand/collapse state from localStorage
const expandedLeagues = ref<Record<string, boolean>>((() => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LEAGUE_EXPAND_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
})())
const expandedParlayIds = ref<Record<number, boolean>>({})
const viewMode = ref<'games' | 'parlays'>('games')

const navigateToGame = (gameId: number) => {
  navigateTo(`/game/${gameId}`)
}

const toggleLeague = (league: string) => {
  expandedLeagues.value[league] = !expandedLeagues.value[league]
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(LEAGUE_EXPAND_KEY, JSON.stringify(expandedLeagues.value)) } catch {}
  }
}

const toggleParlay = (parlayId: number) => {
  expandedParlayIds.value[parlayId] = !expandedParlayIds.value[parlayId]
}

const fullDate = computed(() => {
  if (!props.date) return ''
  return props.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
})

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

import { getTeamLogoUrl, getLeagueLogoUrl } from '~/utils/teamLogo'

// Sport stats odds
function getOdds(game: any) {
  return game.sport_stats?.odds || null
}

// Check if prediction correct for a game
function isPredictionCorrectFor(game: any) {
  if (!game.predictions?.[0] || game.home_goals === null) return false
  const pred = game.predictions[0].prediction.toLowerCase()
  const h = game.home_goals
  const a = game.away_goals
  const total = h + a
  if (pred === 'home') return h > a
  if (pred === 'draw') return h === a
  if (pred === 'away') return a > h
  // Parse the actual line from prediction string (e.g. "under 219.5", "over 218.5")
  const lineMatch = pred.match(/(\d+\.?\d*)/)
  const line = lineMatch ? parseFloat(lineMatch[1]) : 2.5
  if (pred.startsWith('over')) return total > line
  if (pred.startsWith('under')) return total < line
  return false
}

// Returns the bet/prediction status for a specific odds column direction
function getPredOrBetStatus(game: any, direction: string): 'won' | 'lost' | 'pending' | null {
  const bets = getGameBets(game)

  // Actual bets have real settled status — check first
  let matchBet: any = null
  if (direction === 'over')   matchBet = bets.find((b: any) => b.bet_type === 'OVER' || b.bet_type === 'OVER_ALT')
  else if (direction === 'under')  matchBet = bets.find((b: any) => b.bet_type === 'UNDER' || b.bet_type === 'UNDER_ALT')
  else if (direction === 'home')   matchBet = bets.find((b: any) => b.bet_type === 'HOME_WIN')
  else if (direction === 'away')   matchBet = bets.find((b: any) => b.bet_type === 'AWAY_WIN')
  else if (direction === 'spread') matchBet = bets.find((b: any) => b.bet_type === 'SPREAD_COVER' || b.bet_type?.includes('SPREAD'))

  if (matchBet) return (matchBet.status || 'pending') as 'won' | 'lost' | 'pending'

  // Fall back to prediction
  const pred = game.predictions?.[0]
  if (!pred) return null
  const p = pred.prediction?.toLowerCase() || ''

  const matches =
    (direction === 'over'   && p.startsWith('over')) ||
    (direction === 'under'  && p.startsWith('under')) ||
    (direction === 'home'   && p === 'home') ||
    (direction === 'away'   && p === 'away')

  if (!matches) return null
  if (game.home_goals === null) return 'pending'
  return isPredictionCorrectFor(game) ? 'won' : 'lost'
}

// Returns Tailwind classes to highlight an odds cell based on its bet/prediction status
function getOddsHighlight(game: any, direction: string): string {
  const status = getPredOrBetStatus(game, direction)
  if (!status) return 'text-zinc-400'
  if (status === 'won')    return 'bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/25'
  if (status === 'lost')   return 'bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/25'
  /* pending */ return 'bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20'
}

// Group games by league
const gamesByLeague = computed(() => {
  const grouped: Record<string, any[]> = {}
  
  props.games.forEach(game => {
    const league = game.league_key || 'other'
    if (!grouped[league]) {
      grouped[league] = []
    }
    grouped[league].push(game)
  })
  
  // Sort games within each league by time
  Object.keys(grouped).forEach(league => {
    grouped[league].sort((a, b) => {
      const timeA = new Date(a.date).getTime()
      const timeB = new Date(b.date).getTime()
      return timeA - timeB
    })
  })
  
  return grouped
})

// Default open all league panels (only set keys not already in persisted state)
watch(() => Object.keys(gamesByLeague.value), (keys) => {
  let mutated = false
  keys.forEach(k => {
    if (expandedLeagues.value[k] === undefined) {
      expandedLeagues.value[k] = true
      mutated = true
    }
  })
  if (mutated && typeof window !== 'undefined') {
    try { window.localStorage.setItem(LEAGUE_EXPAND_KEY, JSON.stringify(expandedLeagues.value)) } catch {}
  }
}, { immediate: true })

const getLeagueName = (leagueKey: string) => {
  const league = props.leagues.find(l => l.key === leagueKey)
  return league?.name || leagueKey
}

const getLeaguePredictionCount = (leagueKey: string) => {
  return gamesByLeague.value[leagueKey]?.filter(g => g.predictions && g.predictions.length > 0).length || 0
}

const getLeagueBetCount = (leagueKey: string) => {
  return gamesByLeague.value[leagueKey]?.filter(g => getGameBets(g).length > 0).length || 0
}

// Get parlays that reference games from this day
const dayParlays = computed(() => {
  if (!props.parlays || props.parlays.length === 0) return []
  
  const dayGameIds = new Set(props.games.map(g => g.id))
  
  return props.parlays.filter(parlay => {
    // Check if any leg references a game from this day
    return parlay.parlay_legs?.some((leg: any) => {
      return leg.bets && dayGameIds.has(leg.bets.game_id)
    })
  })
})

// Get game/team names for a parlay leg
// Uses embedded game data from API first, falls back to day's games
const getLegGameName = (leg: any) => {
  // Try embedded game data from the API (includes teams)
  const game = leg.bets?.games
  if (game) {
    const home = game.home_team?.name || game.home_name || 'Unknown'
    const away = game.away_team?.name || game.away_name || 'Unknown'
    return { home, away }
  }
  // Fallback: look up in day's games
  const dayGame = props.games.find(g => g.id === leg.bets?.game_id)
  if (dayGame) {
    return { home: dayGame.home_name, away: dayGame.away_name }
  }
  return null
}

// Wallets that ONLY produce parlays (props strategies). Their per-leg `bets`
// rows must never render as standalone chips on a game card — those legs
// belong to a parlay that spans multiple games.
const PARLAY_ONLY_WALLETS = new Set([19, 20])

function isParlayLeg(bet: any): boolean {
  if (!bet?.notes) return false
  let n: any = bet.notes
  if (typeof n === 'string') {
    try { n = JSON.parse(n) } catch { return false }
  }
  return !!(n && (n.parlay_id || n.pick_type === 'prop_parlay_leg' || n.leg_number))
}

// Get bets for a specific game (from game.bets or from allBets prop).
// Filters out parlay legs and parlay-only wallets so chips only show
// real per-game singles.
function getGameBets(game: any): any[] {
  let raw: any[] = []
  if (game.bets && game.bets.length > 0) raw = game.bets
  else if (props.bets && props.bets.length > 0) {
    raw = props.bets.filter((b: any) => b.game_id === game.id)
  }
  return raw.filter((b: any) => {
    if (PARLAY_ONLY_WALLETS.has(Number(b.wallet_id))) return false
    if (isParlayLeg(b)) return false
    return true
  })
}

// Format bet type for display
function formatBetType(bet: any): string {
  // Prefer canonical short label so the dashboard chip matches /game/[id]
  const short = betLabelShort(bet)
  if (short && short.length <= 14) return short
  const type = bet.bet_type || ''
  const notes = bet.notes || ''

  // If we have notes (e.g. "Over 169.5", "Virtus Bologna +8.5"), use them
  if (notes && notes.length > 0 && notes.length < 40) return notes

  // Format bet type labels
  const labels: Record<string, string> = {
    'OVER': 'Over',
    'UNDER': 'Under',
    'OVER_ALT': 'Over (alt)',
    'UNDER_ALT': 'Under (alt)',
    'HOME_WIN': 'Home ML',
    'AWAY_WIN': 'Away ML',
    'SPREAD_COVER': 'Spread',
    'SGP_HOME_ML_HOME_COVERS': 'SGP: Home+Spread',
    'SGP_AWAY_ML_AWAY_COVERS': 'SGP: Away+Spread',
  }
  return labels[type] || type
}

// Build prediction chip data: short label + EV (if available). Returns null when no
// usable prediction. Used only when game has no placed bet (stake badge supersedes).
function getPredictionChip(game: any): { label: string; ev: string | null } | null {
  const pred = game.predictions?.[0]
  if (!pred) return null
  // Prefer canonical short label via bet-label.ts when bet_type present
  let label = ''
  if (pred.bet_type) {
    label = betLabelShort({ bet_type: pred.bet_type, notes: pred.prediction })
  }
  if (!label) label = formatPredictionLabel(pred)
  if (!label) return null
  // Cap chip width
  if (label.length > 18) label = label.slice(0, 17) + '\u2026'
  let ev: string | null = null
  const evRaw = pred.expected_value ?? pred.ev ?? pred.edge_pct
  if (typeof evRaw === 'number' && isFinite(evRaw)) {
    const evPct = Math.abs(evRaw) <= 1 ? evRaw * 100 : evRaw
    ev = `${evPct >= 0 ? '+' : ''}${evPct.toFixed(0)}%`
  }
  return { label, ev }
}

// Format prediction label for display (handles basketball markets)
function formatPredictionLabel(pred: any): string {
  if (!pred) return ''
  const p = pred.prediction || ''
  // Already a readable label
  if (p.includes(' ')) return p
  // Football predictions
  const upper = p.toUpperCase()
  const map: Record<string, string> = {
    'HOME': 'HOME', 'DRAW': 'DRAW', 'AWAY': 'AWAY',
    'OVER': 'OVER 2.5', 'UNDER': 'UNDER 2.5',
    'OVER_25': 'OVER 2.5', 'UNDER_25': 'UNDER 2.5',
    'OVER_15': 'OVER 1.5', 'UNDER_15': 'UNDER 1.5',
    'OVER_35': 'OVER 3.5', 'UNDER_35': 'UNDER 3.5',
  }
  return map[upper] || p
}

</script>

<style scoped>
.matches-panel {
  background: rgba(28, 31, 39, 0.9);
  border: 1px solid rgba(42, 47, 58, 0.4);
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.02);
}

.panel-header {
  background: linear-gradient(135deg, rgba(248, 40, 40, 0.08), rgba(8, 72, 168, 0.08));
  border-bottom: 1px solid rgba(42, 47, 58, 0.4);
}

.toggle-active {
  background: linear-gradient(135deg, rgba(248, 40, 40, 0.6), rgba(8, 72, 168, 0.6));
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.game-row {
  background: rgba(28, 31, 39, 0.5);
  border: 1px solid rgba(42, 47, 58, 0.3);
}

.game-row:hover {
  border-color: rgba(248, 40, 40, 0.2);
}

.league-card {
  background: rgba(28, 31, 39, 0.6);
  border: 1px solid rgba(42, 47, 58, 0.4);
}

.league-header {
  background: linear-gradient(135deg, rgba(42, 47, 58, 0.5) 0%, rgba(28, 31, 39, 0.8) 100%);
  border-bottom: 1px solid rgba(42, 47, 58, 0.3);
}

.league-header:hover {
  background: linear-gradient(135deg, rgba(42, 47, 58, 0.7) 0%, rgba(28, 31, 39, 0.9) 100%);
}
</style>
