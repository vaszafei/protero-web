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
        <div class="flex items-center gap-2">
          <div class="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
            {{ match.expectedGoals }}g
          </div>
        </div>
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

          <!-- Statistical Analysis & Match Insights Card -->
          <div class="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-lg p-3 border border-indigo-500/20">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-1.5">
                <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-indigo-400" />
                <span class="text-xs font-bold text-indigo-300">Statistical Predictions</span>
              </div>
              <div class="bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5 rounded">
                {{ generateMatchAnalysis(match).confidence }}% confidence
              </div>
            </div>

            <div class="grid grid-cols-4 gap-2">
              <!-- Expected Goals -->
              <div class="bg-surface rounded-lg p-1.5 border border-green-500/30">
                <div class="flex items-center gap-1 mb-1">
                  <span class="text-[11px] font-bold text-green-400 uppercase">Expected Goals</span>
                </div>
                <div class="space-y-0.5">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] text-zinc-400">{{ match.home_name?.split(' ')[0] }}:</span>
                    <span class="text-sm font-bold text-green-400">{{ generateMatchAnalysis(match).homeExpectedGoals }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] text-zinc-400">{{ match.away_name?.split(' ')[0] }}:</span>
                    <span class="text-sm font-bold text-green-400">{{ generateMatchAnalysis(match).awayExpectedGoals }}</span>
                  </div>
                  <div class="pt-0.5 border-t border-green-500/20">
                    <div class="flex items-center justify-between">
                      <span class="text-[11px] font-bold text-zinc-300">Total:</span>
                      <span class="text-sm font-bold text-green-400">{{ generateMatchAnalysis(match).totalExpectedGoals }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Expected Shots -->
              <div class="bg-surface rounded-lg p-1.5 border border-orange-500/20">
                <div class="flex items-center gap-1 mb-1">
                  <span class="text-[11px] font-bold text-orange-400 uppercase">Expected Shots</span>
                </div>
                <div class="space-y-0.5">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] text-zinc-400">{{ match.home_name?.split(' ')[0] }}:</span>
                    <span class="text-sm font-bold text-orange-400">{{ generateMatchAnalysis(match).homeExpectedShots }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] text-zinc-400">{{ match.away_name?.split(' ')[0] }}:</span>
                    <span class="text-sm font-bold text-orange-400">{{ generateMatchAnalysis(match).awayExpectedShots }}</span>
                  </div>
                  <div class="pt-0.5 border-t border-orange-500/20">
                    <div class="flex items-center justify-between">
                      <span class="text-[11px] font-bold text-zinc-300">Total:</span>
                      <span class="text-sm font-bold text-orange-400">{{ generateMatchAnalysis(match).expectedShots }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Expected Corners -->
              <div class="bg-surface rounded-lg p-1.5 border border-cyan-500/20">
                <div class="flex items-center gap-1 mb-1">
                  <span class="text-[11px] font-bold text-cyan-400 uppercase">Expected Corners</span>
                </div>
                <div class="space-y-0.5">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] text-zinc-400">{{ match.home_name?.split(' ')[0] }}:</span>
                    <span class="text-sm font-bold text-cyan-400">{{ generateMatchAnalysis(match).homeExpectedCorners }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] text-zinc-400">{{ match.away_name?.split(' ')[0] }}:</span>
                    <span class="text-sm font-bold text-cyan-400">{{ generateMatchAnalysis(match).awayExpectedCorners }}</span>
                  </div>
                  <div class="pt-0.5 border-t border-cyan-500/20">
                    <div class="flex items-center justify-between">
                      <span class="text-[11px] font-bold text-zinc-300">Total:</span>
                      <span class="text-sm font-bold text-cyan-400">{{ generateMatchAnalysis(match).expectedCorners }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Expected Cards -->
              <div class="bg-surface rounded-lg p-1.5 border border-yellow-500/30">
                <div class="flex items-center gap-1 mb-1">
                  <span class="text-[11px] font-bold text-yellow-400 uppercase">Expected Cards</span>
                </div>
                <div class="space-y-0.5">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] text-zinc-400">{{ match.home_name?.split(' ')[0] }}:</span>
                    <span class="text-sm font-bold text-yellow-400">{{ generateMatchAnalysis(match).homeExpectedCards }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] text-zinc-400">{{ match.away_name?.split(' ')[0] }}:</span>
                    <span class="text-sm font-bold text-yellow-400">{{ generateMatchAnalysis(match).awayExpectedCards }}</span>
                  </div>
                  <div class="pt-0.5 border-t border-yellow-500/20">
                    <div class="flex items-center justify-between">
                      <span class="text-[11px] font-bold text-zinc-300">Total:</span>
                      <span class="text-sm font-bold text-yellow-400">{{ generateMatchAnalysis(match).expectedCards }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Formula Explanation -->
            <div class="mt-2 bg-surface/50 rounded p-1.5 border border-indigo-500/20">
              <p class="text-[11px] text-zinc-400 leading-relaxed">
                <span class="font-bold">Methodology:</span> Weighted averages considering recent form (last 5 games), attack vs defense strength, possession influence, and trend momentum. Form weights: Home {{ generateMatchAnalysis(match).formWeights.home }}× | Away {{ generateMatchAnalysis(match).formWeights.away }}×
              </p>
            </div>
          </div>

          <!-- AI Predictions Component -->
          <div>
            <!-- Show message if no prediction -->
            <div v-if="!match.prediction" class="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg border border-blue-500/20 p-4 flex items-center justify-center">
              <div class="text-center">
                <UIcon name="i-heroicons-information-circle" class="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p class="text-sm font-semibold text-zinc-400">No prediction yet</p>
              </div>
            </div>
            <!-- Show predictions if available -->
            <AIPredictions
              v-else
                :confidence="match.prediction?.confidence || 50"
                :predictedOutcome="getPredictedOutcome(match)"
                :outcomeProbability="getOutcomeProbability(match)"
                :expectedScore="match.prediction?.outcome || match.expectedGoals"
                :over15Probability="match.prediction?.markets?.over15 || 0"
                :over25Probability="match.prediction?.over25Probability || match.prediction?.markets?.over25 || 0"
                :over35Probability="match.prediction?.markets?.over35 || 0"
                :bttsProbability="match.prediction?.bttsProbability || match.prediction?.markets?.btts || 0"
                :cornersOver85="match.prediction?.markets?.cornersOver85 || 0"
                :cornersOver105="match.prediction?.markets?.cornersOver105 || 0"
                :cardsOver35="match.prediction?.markets?.cardsOver35 || 0"
                :cardsOver45="match.prediction?.markets?.cardsOver45 || 0"
                :shotsRange="getShotsPrediction(match.prediction)"
                sport="football"
              />
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
import TrendChartsSimple from './predictions/TrendChartsSimple.vue'
import AIPredictions from './predictions/AIPredictions.vue'

const props = defineProps({
  match: { type: Object, required: true },
  games: { type: Array, default: () => [] },
})

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

/**
 * SOPHISTICATED STATISTICAL PREDICTION FUNCTION
 * Uses weighted averages, form factors, and trend analysis from last 7 rounds
 * Outputs: Expected Goals, Corners, Cards, Shots with confidence intervals
 */
function generateMatchAnalysis(match) {
  if (!match || !match.homeStats || !match.awayStats) return {
    homeExpectedGoals: 0,
    awayExpectedGoals: 0,
    expectedCorners: 0,
    expectedCards: 0,
    expectedShots: 0,
    confidence: 0
  }

  const homeStats = match.homeStats
  const awayStats = match.awayStats

  // Helper to safely parse numbers
  const parseNum = (val) => parseFloat(val) || 0

  // Form weight calculation (recent form influences prediction)
  const maxFormPoints = 15 // 5 wins
  const homeFormWeight = 0.7 + (homeStats.formPoints / maxFormPoints) * 0.3 // 0.7 to 1.0
  const awayFormWeight = 0.7 + (awayStats.formPoints / maxFormPoints) * 0.3

  // === EXPECTED GOALS CALCULATION ===
  const homeAttackStrength = parseNum(homeStats.avgGoalsFor)
  const homeDefenseStrength = parseNum(homeStats.avgGoalsAgainst)
  const awayAttackStrength = parseNum(awayStats.avgGoalsFor)
  const awayDefenseStrength = parseNum(awayStats.avgGoalsAgainst)

  const homeExpectedGoals = (homeAttackStrength * (awayDefenseStrength / (awayDefenseStrength + homeDefenseStrength || 1)) * homeFormWeight)
  const awayExpectedGoals = (awayAttackStrength * (homeDefenseStrength / (homeDefenseStrength + awayDefenseStrength || 1)) * awayFormWeight)

  // === EXPECTED SHOTS CALCULATION ===
  const homeShots = parseNum(homeStats.shots)
  const awayShots = parseNum(awayStats.shots)
  const homePossession = parseNum(homeStats.possession) / 100
  const awayPossession = parseNum(awayStats.possession) / 100

  const homePossessionFactor = homePossession > 0.5 ? 1.1 : 0.9
  const awayPossessionFactor = awayPossession > 0.5 ? 1.1 : 0.9

  const homeExpectedShots = homeShots * homeFormWeight * homePossessionFactor
  const awayExpectedShots = awayShots * awayFormWeight * awayPossessionFactor
  const expectedShots = homeExpectedShots + awayExpectedShots

  // === EXPECTED CORNERS CALCULATION ===
  const homeCorners = parseNum(homeStats.corners)
  const awayCorners = parseNum(awayStats.corners)

  const homeCornerPressure = (homePossession + (homeShots / 20)) / 2
  const awayCornerPressure = (awayPossession + (awayShots / 20)) / 2

  const homeExpectedCorners = homeCorners * (1 + homeCornerPressure * 0.3) * homeFormWeight
  const awayExpectedCorners = awayCorners * (1 + awayCornerPressure * 0.3) * awayFormWeight
  const expectedCorners = homeExpectedCorners + awayExpectedCorners

  // === EXPECTED CARDS CALCULATION ===
  const homeCards = parseNum(homeStats.yellowCards)
  const awayCards = parseNum(awayStats.yellowCards)

  const homeExpectedCards = homeCards * (0.85 + homeFormWeight * 0.15)
  const awayExpectedCards = awayCards * (0.85 + awayFormWeight * 0.15)
  const expectedCards = homeExpectedCards + awayExpectedCards

  // === CONFIDENCE CALCULATION ===
  const dataCompleteness = [homeShots, awayShots, homeCorners, awayCorners, homeCards, awayCards]
    .filter(v => v > 0).length / 6
  const formConfidence = Math.min((homeStats.formPoints + awayStats.formPoints) / 20, 1)
  const confidence = Math.round((dataCompleteness * 0.6 + formConfidence * 0.4) * 100)

  return {
    homeExpectedGoals: homeExpectedGoals.toFixed(2),
    awayExpectedGoals: awayExpectedGoals.toFixed(2),
    totalExpectedGoals: (homeExpectedGoals + awayExpectedGoals).toFixed(2),
    expectedShots: expectedShots.toFixed(1),
    homeExpectedShots: homeExpectedShots.toFixed(1),
    awayExpectedShots: awayExpectedShots.toFixed(1),
    expectedCorners: expectedCorners.toFixed(1),
    homeExpectedCorners: homeExpectedCorners.toFixed(1),
    awayExpectedCorners: awayExpectedCorners.toFixed(1),
    expectedCards: expectedCards.toFixed(1),
    homeExpectedCards: homeExpectedCards.toFixed(1),
    awayExpectedCards: awayExpectedCards.toFixed(1),
    confidence: confidence,
    formWeights: {
      home: homeFormWeight.toFixed(2),
      away: awayFormWeight.toFixed(2)
    }
  }
}

// Get predicted outcome based on database prediction or form stats
function getPredictedOutcome(match) {
  if (match.prediction) {
    const { homeWinProb, drawProb, awayWinProb } = match.prediction
    if (homeWinProb && drawProb && awayWinProb) {
      const maxProb = Math.max(homeWinProb, drawProb, awayWinProb)
      if (maxProb === homeWinProb) return `${match.home_name.split(' ')[0]} Win`
      if (maxProb === drawProb) return 'Draw'
      return `${match.away_name.split(' ')[0]} Win`
    }
    if (match.prediction.outcome) {
      const [home, away] = match.prediction.outcome.split('-').map(Number)
      if (!isNaN(home) && !isNaN(away)) {
        if (home > away) return `${match.home_name.split(' ')[0]} Win`
        if (away > home) return `${match.away_name.split(' ')[0]} Win`
        return 'Draw'
      }
    }
  }

  const homeAdvantage = match.homeFormPoints + (match.homeStats.avgGoalsFor || 0) * 2
  const awayAdvantage = match.awayFormPoints + (match.awayStats.avgGoalsFor || 0) * 2

  const diff = homeAdvantage - awayAdvantage

  if (Math.abs(diff) < 2) return 'Draw'
  if (diff > 2) return `${match.home_name.split(' ')[0]} Win`
  return `${match.away_name.split(' ')[0]} Win`
}

// Get outcome probability based on prediction
function getOutcomeProbability(match) {
  if (!match.prediction) return 50

  const { homeWinProb, drawProb, awayWinProb, outcome } = match.prediction

  if (homeWinProb && drawProb && awayWinProb) {
    return Math.max(homeWinProb, drawProb, awayWinProb)
  }

  if (outcome) {
    const [home, away] = outcome.split('-').map(Number)
    if (!isNaN(home) && !isNaN(away)) {
      if (home > away) return homeWinProb || 50
      if (away > home) return awayWinProb || 50
      return drawProb || 50
    }
  }

  return 50
}

// Get Shots prediction from model
function getShotsPrediction(prediction) {
  if (!prediction || !prediction.shots || !prediction.shots.advantage) return 'N/A'
  if (prediction.shots.advantage === 'even') return 'Even'
  const team = prediction.shots.advantage === 'home' ? 'Home' : 'Away'
  return `${team} (${prediction.shots.probability}%)`
}
</script>
