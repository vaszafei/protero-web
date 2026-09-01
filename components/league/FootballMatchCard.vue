<template>
  <div class="bg-surface rounded-lg border border-edge hover:border-primary-500/50 hover:shadow-sm transition-all overflow-hidden">
    <!-- Main Content - Ultra Compact Layout -->
    <div class="p-3">
      <!-- Match Info Header -->
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="text-base font-bold text-zinc-100">{{ match.home_name }}</span>
          <span class="text-sm text-zinc-500">vs</span>
          <span class="text-base font-bold text-zinc-100">{{ match.away_name }}</span>
        </div>
        <div v-if="match.prediction_id" class="flex items-center gap-2">
          <span class="text-[10px] text-zinc-600">model call</span>
          <span class="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
            {{ match.prediction }} @ {{ Number(modelDetail.decimal_odds || 0).toFixed(2) }}
          </span>
        </div>
        <span v-else class="text-[10px] text-zinc-700">no model call yet</span>
      </div>

      <!-- Stats and Trend Charts Row -->
      <div class="flex flex-col lg:flex-row gap-3 mb-3">
        <!-- Combined Form & Stats -->
        <div class="lg:flex-[3]">
          <div class="bg-surface-light rounded-lg p-2 border border-edge">
            <!-- Form Row -->
            <div class="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-edge">
              <!-- Home Form -->
              <div class="flex items-center gap-2">
                <div class="flex items-center gap-0.5">
                  <span
                    v-for="(result, i) in match.homeRecentForm"
                    :key="i"
                    :class="[
                      'w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center text-white',
                      result.result === 'W' ? 'bg-green-500/200' : result.result === 'D' ? 'bg-yellow-500' : 'bg-red-500/200'
                    ]"
                  >
                    {{ result.result }}
                  </span>
                </div>
                <span class="text-xs font-bold text-green-400">{{ match.homeFormPoints }}pts</span>
              </div>

              <!-- Center Label -->
              <span class="text-xs font-semibold text-zinc-400">Form</span>

              <!-- Away Form -->
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-green-400">{{ match.awayFormPoints }}pts</span>
                <div class="flex items-center gap-0.5">
                  <span
                    v-for="(result, i) in match.awayRecentForm"
                    :key="i"
                    :class="[
                      'w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center text-white',
                      result.result === 'W' ? 'bg-green-500/200' : result.result === 'D' ? 'bg-yellow-500' : 'bg-red-500/200'
                    ]"
                  >
                    {{ result.result }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Stats in Horizontal Bars (Home team HOME stats vs Away team AWAY stats) -->
            <div class="space-y-1.5">
              <!-- Expected Goals -->
              <div>
                <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                  <span class="font-bold">{{ match.homeStats.avgGoalsFor || '0.0' }}</span>
                  <span class="font-medium">Expected goals</span>
                  <span class="font-bold">{{ match.awayStats.avgGoalsFor || '0.0' }}</span>
                </div>
                <div class="flex h-1.5 bg-edge rounded-full overflow-hidden">
                  <div class="bg-gradient-to-r from-blue-600 to-blue-500" :style="{ width: getBarWidth(match.homeStats.avgGoalsFor, match.awayStats.avgGoalsFor, 'left') }"></div>
                  <div class="bg-gradient-to-l from-green-600 to-green-500" :style="{ width: getBarWidth(match.homeStats.avgGoalsFor, match.awayStats.avgGoalsFor, 'right') }"></div>
                </div>
              </div>

              <!-- Goals Against -->
              <div>
                <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                  <span class="font-bold">{{ match.homeStats.avgGoalsAgainst || '0.0' }}</span>
                  <span class="font-medium">Expected goals against</span>
                  <span class="font-bold">{{ match.awayStats.avgGoalsAgainst || '0.0' }}</span>
                </div>
                <div class="flex h-1.5 bg-edge rounded-full overflow-hidden">
                  <div class="bg-gradient-to-r from-blue-600 to-blue-500" :style="{ width: getBarWidth(match.homeStats.avgGoalsAgainst, match.awayStats.avgGoalsAgainst, 'left') }"></div>
                  <div class="bg-gradient-to-l from-green-600 to-green-500" :style="{ width: getBarWidth(match.homeStats.avgGoalsAgainst, match.awayStats.avgGoalsAgainst, 'right') }"></div>
                </div>
              </div>

              <!-- Possession -->
              <div>
                <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                  <span class="font-bold">{{ match.homeStats.possession || '0' }}%</span>
                  <span class="font-medium">Ball possession</span>
                  <span class="font-bold">{{ match.awayStats.possession || '0' }}%</span>
                </div>
                <div class="flex h-1.5 bg-edge rounded-full overflow-hidden">
                  <div class="bg-gradient-to-r from-blue-600 to-blue-500" :style="{ width: getBarWidth(match.homeStats.possession, match.awayStats.possession, 'left') }"></div>
                  <div class="bg-gradient-to-l from-green-600 to-green-500" :style="{ width: getBarWidth(match.homeStats.possession, match.awayStats.possession, 'right') }"></div>
                </div>
              </div>

              <!-- Shots -->
              <div>
                <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                  <span class="font-bold">{{ match.homeStats.shots || '0' }}</span>
                  <span class="font-medium">Total shots</span>
                  <span class="font-bold">{{ match.awayStats.shots || '0' }}</span>
                </div>
                <div class="flex h-1.5 bg-edge rounded-full overflow-hidden">
                  <div class="bg-gradient-to-r from-blue-600 to-blue-500" :style="{ width: getBarWidth(match.homeStats.shots, match.awayStats.shots, 'left') }"></div>
                  <div class="bg-gradient-to-l from-green-600 to-green-500" :style="{ width: getBarWidth(match.homeStats.shots, match.awayStats.shots, 'right') }"></div>
                </div>
              </div>

              <!-- Shots Against -->
              <div>
                <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                  <span class="font-bold">{{ match.homeStats.avgShotsAgainst || '0' }}</span>
                  <span class="font-medium">Total shots against</span>
                  <span class="font-bold">{{ match.awayStats.avgShotsAgainst || '0' }}</span>
                </div>
                <div class="flex h-1.5 bg-edge rounded-full overflow-hidden">
                  <div class="bg-gradient-to-r from-blue-600 to-blue-500" :style="{ width: getBarWidth(match.homeStats.avgShotsAgainst, match.awayStats.avgShotsAgainst, 'left') }"></div>
                  <div class="bg-gradient-to-l from-green-600 to-green-500" :style="{ width: getBarWidth(match.homeStats.avgShotsAgainst, match.awayStats.avgShotsAgainst, 'right') }"></div>
                </div>
              </div>

              <!-- Corners -->
              <div>
                <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                  <span class="font-bold">{{ match.homeStats.corners || '0' }}</span>
                  <span class="font-medium">Corner kicks</span>
                  <span class="font-bold">{{ match.awayStats.corners || '0' }}</span>
                </div>
                <div class="flex h-1.5 bg-edge rounded-full overflow-hidden">
                  <div class="bg-gradient-to-r from-blue-600 to-blue-500" :style="{ width: getBarWidth(match.homeStats.corners, match.awayStats.corners, 'left') }"></div>
                  <div class="bg-gradient-to-l from-green-600 to-green-500" :style="{ width: getBarWidth(match.homeStats.corners, match.awayStats.corners, 'right') }"></div>
                </div>
              </div>

              <!-- Corners Against -->
              <div>
                <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                  <span class="font-bold">{{ match.homeStats.avgCornersAgainst || '0' }}</span>
                  <span class="font-medium">Corner kicks against</span>
                  <span class="font-bold">{{ match.awayStats.avgCornersAgainst || '0' }}</span>
                </div>
                <div class="flex h-1.5 bg-edge rounded-full overflow-hidden">
                  <div class="bg-gradient-to-r from-blue-600 to-blue-500" :style="{ width: getBarWidth(match.homeStats.avgCornersAgainst, match.awayStats.avgCornersAgainst, 'left') }"></div>
                  <div class="bg-gradient-to-l from-green-600 to-green-500" :style="{ width: getBarWidth(match.homeStats.avgCornersAgainst, match.awayStats.avgCornersAgainst, 'right') }"></div>
                </div>
              </div>

              <!-- Yellow Cards -->
              <div>
                <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                  <span class="font-bold">{{ match.homeStats.yellowCards || '0' }}</span>
                  <span class="font-medium">Yellow cards</span>
                  <span class="font-bold">{{ match.awayStats.yellowCards || '0' }}</span>
                </div>
                <div class="flex h-1.5 bg-edge rounded-full overflow-hidden">
                  <div class="bg-gradient-to-r from-blue-600 to-blue-500" :style="{ width: getBarWidth(match.homeStats.yellowCards, match.awayStats.yellowCards, 'left') }"></div>
                  <div class="bg-gradient-to-l from-green-600 to-green-500" :style="{ width: getBarWidth(match.homeStats.yellowCards, match.awayStats.yellowCards, 'right') }"></div>
                </div>
              </div>

              <!-- Yellow Cards Against -->
              <div>
                <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-0.5">
                  <span class="font-bold">{{ match.homeStats.avgCardsAgainst || '0' }}</span>
                  <span class="font-medium">Yellow cards against</span>
                  <span class="font-bold">{{ match.awayStats.avgCardsAgainst || '0' }}</span>
                </div>
                <div class="flex h-1.5 bg-edge rounded-full overflow-hidden">
                  <div class="bg-gradient-to-r from-blue-600 to-blue-500" :style="{ width: getBarWidth(match.homeStats.avgCardsAgainst, match.awayStats.avgCardsAgainst, 'left') }"></div>
                  <div class="bg-gradient-to-l from-green-600 to-green-500" :style="{ width: getBarWidth(match.homeStats.avgCardsAgainst, match.awayStats.avgCardsAgainst, 'right') }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Trend Charts + Predictions -->
        <div class="lg:flex-[7] space-y-3">
          <!-- Trend Charts Component -->
          <div>
            <TrendChartsSimple
              :homeName="match.home_name"
              :awayName="match.away_name"
              :games="games"
            />
          </div>

          <!-- Model call — the picker's own output, never a UI formula.
               The model_details JSONB carries exactly one wager per game:
               market, selection, model probability, edge and the price it
               was sized against. -->
          <div v-if="match.prediction_id" class="bg-surface-light rounded-lg p-3 border border-edge">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-zinc-300">Model call</span>
              <span class="text-[10px] text-zinc-600 tabular-nums">
                {{ probSourceLabel(modelDetail) }} · v6
              </span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div>
                <p class="text-[10px] text-zinc-600 uppercase tracking-wide">Pick</p>
                <p class="text-sm font-bold text-zinc-100 tabular-nums">{{ modelDetail.selection || match.prediction }}</p>
              </div>
              <div>
                <p class="text-[10px] text-zinc-600 uppercase tracking-wide">Model prob</p>
                <p class="text-sm font-bold text-zinc-100 tabular-nums">{{ pct(modelDetail.model_prob) }}</p>
              </div>
              <div>
                <p class="text-[10px] text-zinc-600 uppercase tracking-wide">Edge</p>
                <p class="text-sm font-bold tabular-nums" :class="edgeClass(modelDetail.edge)">
                  {{ signedPct(modelDetail.edge) }}
                </p>
              </div>
              <div>
                <p class="text-[10px] text-zinc-600 uppercase tracking-wide">Price</p>
                <p class="text-sm font-bold text-zinc-100 tabular-nums">{{ Number(modelDetail.decimal_odds || 0).toFixed(2) }}</p>
              </div>
            </div>
            <p class="mt-2 text-[10px] text-zinc-600 leading-relaxed">
              This is the model's actual output — probability, edge and the price it was sized
              against. No expected-goals, shots or corners are invented here; those belong to the
              Analysis tab, where every rate carries its n.
            </p>
          </div>

          <div v-else class="bg-surface-light rounded-lg p-3 border border-edge text-center">
            <p class="text-sm font-semibold text-zinc-500">No model call yet</p>
            <p class="text-[10px] text-zinc-600 mt-1">
              The football pipeline posts a slate on the nearest matchday with odds; nothing is
              fabricated in the browser.
            </p>
          </div>
        </div>
      </div>

      <!-- Head to Head (if available) -->
      <div v-if="match.h2h && match.h2h.length > 0" class="mt-4 px-3">
        <details class="group">
          <summary class="cursor-pointer text-xs font-semibold text-zinc-300 hover:text-zinc-100 flex items-center gap-1">
            <UIcon name="i-heroicons-chevron-right" class="w-3 h-3 transition-transform group-open:rotate-90" />
            Head to Head ({{ match.h2h.length }} matches)
            <span v-if="match.h2hSummary" class="ml-2 text-zinc-500 font-normal">
              {{ match.home_name }}: {{ match.h2hSummary.homeTeamWins }}W •
              {{ match.h2hSummary.draws }}D •
              {{ match.away_name }}: {{ match.h2hSummary.awayTeamWins }}W
            </span>
          </summary>
          <!-- H2H Summary Bar -->
          <div v-if="match.h2hSummary" class="mt-2 mb-2">
            <div class="flex h-2 rounded-full overflow-hidden bg-edge">
              <div
                class="bg-green-500/200"
                :style="{ width: `${(match.h2hSummary.homeTeamWins / match.h2hSummary.totalMatches) * 100}%` }"
                :title="`${match.home_name} wins: ${match.h2hSummary.homeTeamWins}`"
              ></div>
              <div
                class="bg-yellow-400"
                :style="{ width: `${(match.h2hSummary.draws / match.h2hSummary.totalMatches) * 100}%` }"
                :title="`Draws: ${match.h2hSummary.draws}`"
              ></div>
              <div
                class="bg-red-500/200"
                :style="{ width: `${(match.h2hSummary.awayTeamWins / match.h2hSummary.totalMatches) * 100}%` }"
                :title="`${match.away_name} wins: ${match.h2hSummary.awayTeamWins}`"
              ></div>
            </div>
            <div class="flex justify-between text-[11px] text-zinc-500 mt-1">
              <span>Avg {{ match.h2hSummary.avgGoalsPerMatch }} goals/match</span>
              <span>Total {{ match.h2hSummary.totalGoals }} goals</span>
            </div>
          </div>
          <!-- Match List -->
          <div class="space-y-1">
            <div
              v-for="(game, idx) in match.h2h"
              :key="idx"
              class="flex items-center justify-between text-xs bg-surface-light rounded px-3 py-2 border border-edge/50"
            >
              <span class="text-zinc-500 w-16">{{ game.season }}</span>
              <span class="font-medium text-zinc-200 flex-1 text-center">
                <span :class="game.homeTeam === match.home_name ? 'font-bold' : ''">{{ game.homeTeam }}</span>
                <span class="mx-2 px-2 py-0.5 bg-edge rounded">{{ game.homeGoals }}-{{ game.awayGoals }}</span>
                <span :class="game.awayTeam === match.home_name ? 'font-bold' : ''">{{ game.awayTeam }}</span>
              </span>
              <span
                class="w-5 h-5 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                :class="game.result === 'W' ? 'bg-green-500/200' : game.result === 'L' ? 'bg-red-500/200' : 'bg-yellow-500'"
                :title="game.result === 'W' ? `${match.home_name} won` : game.result === 'L' ? `${match.away_name} won` : 'Draw'"
              >
                {{ game.result }}
              </span>
            </div>
          </div>
        </details>
      </div>
    </div>
    <!-- End of Main Content -->
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TrendChartsSimple from './predictions/TrendChartsSimple.vue'

const props = defineProps({
  match: { type: Object, required: true },
  games: { type: Array, default: () => [] },
})

/**
 * The picker's one real wager for this game, parsed from `model_details`.
 * The shape is { market, selection, model_prob, implied_prob, edge,
 * decimal_odds, ... all_bets }. It is the model's own output — never a
 * browser-side formula.
 */
const modelDetail = computed(() => {
  const raw = props.match?.model_details
  if (!raw) return {}
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return {}
  }
})

/** Probability source: DC is calibrated at source; GBM/Poisson go through the isotonic layer. */
function probSourceLabel(d) {
  const src = d?.prob_source || d?.mode || ''
  if (src.includes('dc')) return 'Dixon-Coles'
  if (src.includes('gbm')) return 'GBM ensemble'
  if (src.includes('poisson')) return 'Poisson'
  return 'model'
}

function pct(v) {
  const n = Number(v)
  if (v == null || !Number.isFinite(n)) return '—'
  return `${Math.round(n * 100)}%`
}

function signedPct(v) {
  const n = Number(v)
  if (v == null || !Number.isFinite(n)) return '—'
  return `${n > 0 ? '+' : ''}${(n * 100).toFixed(1)}%`
}

function edgeClass(v) {
  const n = Number(v)
  if (v == null || !Number.isFinite(n)) return 'text-zinc-600'
  return n > 0 ? 'text-emerald-400' : 'text-red-400'
}

// Helper function to calculate bar width for comparison bars
function getBarWidth(leftValue, rightValue, side) {
  const left = parseFloat(leftValue) || 0
  const right = parseFloat(rightValue) || 0
  const total = left + right

  if (total === 0) return '50%'

  if (side === 'left') {
    return `${(left / total) * 100}%`
  } else {
    return `${(right / total) * 100}%`
  }
}
</script>
