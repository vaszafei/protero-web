<template>
  <div>
    <div class="space-y-2">
      <template v-if="isFootball">
        <!-- Three compact cards, not one full-width band. The old "pressure"
             line that sat beside the donut was removed 2026-08-23: it was
             captioned "cumulative shots / SOT / corners by minute" while
             `match_events` carries none of those three (corpus-wide the only
             types are goal, penalty_goal, own-goal, yellow_card, red_card,
             substitution, var, penalty_missed, unknown), so it plotted
             cumulative GOALS — a single step for a 1-0 match. The two accuracy
             readouts moved up here from the foot of the component, where they
             were full-width rows below ten stat bars. -->
        <div v-if="hasFootballHero" class="grid gap-2 sm:grid-cols-3 mb-2">
          <div
            v-if="game.home_possession != null && game.away_possession != null"
            class="rounded-lg bg-surface/40 border border-edge/50 px-3 py-2"
          >
            <PossessionDonut
              :home="Number(game.home_possession)"
              :away="Number(game.away_possession)"
              :home-label="game.home_name"
              :away-label="game.away_name"
            />
          </div>

          <div v-if="hasShootingStats" class="rounded-lg bg-surface/40 border border-edge/50 px-3 py-2 flex flex-col justify-center">
            <p class="text-center text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Shot Accuracy</p>
            <div class="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <span class="text-base font-bold tabular-nums" :style="{ color: VIZ_HOME }">{{ homeAccuracy }}%</span>
              <div class="flex h-1.5 rounded-full overflow-hidden bg-surface-light">
                <div :style="{ width: split(homeAccuracy, awayAccuracy) + '%', background: VIZ_HOME }" />
                <div class="flex-1" :style="{ background: VIZ_AWAY }" />
              </div>
              <span class="text-base font-bold tabular-nums" :style="{ color: VIZ_AWAY }">{{ awayAccuracy }}%</span>
            </div>
            <p class="mt-1.5 text-center text-[10px] text-zinc-600">on target / total shots</p>
          </div>

          <div v-if="hasPassingStats" class="rounded-lg bg-surface/40 border border-edge/50 px-3 py-2 flex flex-col justify-center">
            <p class="text-center text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Pass Accuracy</p>
            <div class="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <span class="text-base font-bold tabular-nums" :style="{ color: VIZ_HOME }">{{ homePassAccuracy }}%</span>
              <div class="flex h-1.5 rounded-full overflow-hidden bg-surface-light">
                <div :style="{ width: split(homePassAccuracy, awayPassAccuracy) + '%', background: VIZ_HOME }" />
                <div class="flex-1" :style="{ background: VIZ_AWAY }" />
              </div>
              <span class="text-base font-bold tabular-nums" :style="{ color: VIZ_AWAY }">{{ awayPassAccuracy }}%</span>
            </div>
            <p class="mt-1.5 text-center text-[10px] text-zinc-600 tabular-nums">
              {{ game.home_passes_completed }}/{{ game.home_passes_attempted }} · {{ game.away_passes_completed }}/{{ game.away_passes_attempted }}
            </p>
          </div>
        </div>
      </template>

      <!-- The stat stack reads as a comparison table, not a scroll: two
           columns on anything wider than a phone halves its height. -->
      <div v-if="isFootball" class="grid sm:grid-cols-2 gap-x-6 gap-y-0 items-start">

      <!-- Shots (football only) -->
      <StatBar 
        v-if="isFootball && game.home_shots != null && game.away_shots != null"
        label="Shots"
        :home-value="game.home_shots"
        :away-value="game.away_shots"
      />

      <!-- Shots on Target (football only) -->
      <StatBar 
        v-if="isFootball && game.home_shots_on_target != null && game.away_shots_on_target != null"
        label="Shots on Target"
        :home-value="game.home_shots_on_target"
        :away-value="game.away_shots_on_target"
      />

      <!-- Corners (football only) -->
      <StatBar 
        v-if="isFootball && game.home_corners != null && game.away_corners != null"
        label="Corners"
        :home-value="game.home_corners"
        :away-value="game.away_corners"
      />

      <!-- Fouls (football only) -->
      <StatBar 
        v-if="isFootball && game.home_fouls != null && game.away_fouls != null"
        label="Fouls"
        :home-value="game.home_fouls"
        :away-value="game.away_fouls"
      />

      <!-- Yellow Cards (football only) -->
      <StatBar 
        v-if="isFootball && game.home_yellow_cards != null && game.away_yellow_cards != null"
        label="Yellow Cards"
        :home-value="game.home_yellow_cards"
        :away-value="game.away_yellow_cards"
        color="yellow"
      />

      <!-- Red Cards (football only) -->
      <StatBar 
        v-if="isFootball && game.home_red_cards != null && game.away_red_cards != null"
        label="Red Cards"
        :home-value="game.home_red_cards"
        :away-value="game.away_red_cards"
        color="red"
      />

      <!-- Offsides (football only) -->
      <StatBar 
        v-if="isFootball && game.home_offsides != null && game.away_offsides != null"
        label="Offsides"
        :home-value="game.home_offsides"
        :away-value="game.away_offsides"
      />

      <!-- Expected Goals (football only) -->
      <StatBar 
        v-if="isFootball && game.home_xg != null && game.away_xg != null && (game.home_xg > 0 || game.away_xg > 0)"
        label="Expected Goals (xG)"
        :home-value="parseFloat(game.home_xg.toFixed(2))"
        :away-value="parseFloat(game.away_xg.toFixed(2))"
        color="blue"
      />

      <!-- Big Chances (football only) -->
      <StatBar 
        v-if="isFootball && game.home_big_chances != null && game.away_big_chances != null && (game.home_big_chances > 0 || game.away_big_chances > 0)"
        label="Big Chances"
        :home-value="game.home_big_chances"
        :away-value="game.away_big_chances"
      />

      <!-- Goalkeeper Saves (football only) -->
      <StatBar 
        v-if="isFootball && game.home_saves != null && game.away_saves != null && (game.home_saves > 0 || game.away_saves > 0)"
        label="Goalkeeper Saves"
        :home-value="game.home_saves"
        :away-value="game.away_saves"
      />
      </div>

      <!-- Basketball: every number comes from utils/basketball-box, which returns null — rendered
           as a dash with its reason — for anything the feed does not carry. -->
      <div v-if="!isFootball && hasBballStats">
        <!-- Quarter scores are NOT repeated here: `QuarterFlow` in the centre
             column plots the running margin and carries the same table under
             it. This panel starts at the shooting splits. -->
        <p v-if="boxNotes.length" class="mb-1 text-center text-[10px] text-zinc-500" data-testid="box-notes">{{ boxNotes.join(' · ') }}</p>

        <div class="space-y-0" data-testid="bball-shooting">
        <div v-for="shot in shootingStats" :key="shot.key" class="py-1.5" :data-testid="`bball-shot-${shot.key}`">
          <div class="text-center text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-1">
            {{ shot.label }}
          </div>
          <div class="grid grid-cols-[64px_1fr_64px] items-center gap-2">
            <div class="text-right" :title="shot.homeText === '—' ? bx.reason('home', shot.key) : undefined">
              <span class="text-[13px] font-semibold text-brand-blue tabular-nums" data-testid="shot-home">{{ shot.homeText }}</span>
              <span class="block text-[10px] text-zinc-500 tabular-nums">{{ shot.homePct == null ? '—' : shot.homePct + '%' }}</span>
            </div>
            <div class="flex items-center gap-0">
              <div class="flex-1 h-[5px] bg-surface-light/60 rounded-l-full overflow-hidden flex justify-end">
                <div class="h-full rounded-l-full bg-gradient-to-l from-brand-blue/60 to-brand-blue/25" :style="{ width: (shot.homePct ?? 0) + '%' }" />
              </div>
              <div class="w-px h-3 bg-zinc-600/60 flex-shrink-0" />
              <div class="flex-1 h-[5px] bg-surface-light/60 rounded-r-full overflow-hidden">
                <div class="h-full rounded-r-full bg-gradient-to-r from-brand-red/25 to-brand-red/60" :style="{ width: (shot.awayPct ?? 0) + '%' }" />
              </div>
            </div>
            <div class="text-left" :title="shot.awayText === '—' ? bx.reason('away', shot.key) : undefined">
              <span class="text-[13px] font-semibold text-brand-red tabular-nums" data-testid="shot-away">{{ shot.awayText }}</span>
              <span class="block text-[10px] text-zinc-500 tabular-nums">{{ shot.awayPct == null ? '—' : shot.awayPct + '%' }}</span>
            </div>
          </div>
        </div>
        </div>

        <div class="border-t border-edge my-3" />

        <div class="space-y-0" data-testid="bball-rebounds">
        <StatBar label="Total Rebounds" :home-value="bx.home.reb" :away-value="bx.away.reb" :reason="why('reb')" />
        <StatBar label="Offensive Reb" :home-value="bx.home.oreb" :away-value="bx.away.oreb" :reason="why('oreb')" />
        <StatBar label="Defensive Reb" :home-value="bx.home.dreb" :away-value="bx.away.dreb" :reason="why('dreb')" />
        </div>

        <div class="border-t border-edge my-3" />

        <div class="space-y-0">
        <StatBar label="Assists" :home-value="bx.home.ast" :away-value="bx.away.ast" :reason="why('ast')" />
        <StatBar label="Steals" :home-value="bx.home.stl" :away-value="bx.away.stl" :reason="why('stl')" />
        <StatBar label="Turnovers" :home-value="bx.home.tov" :away-value="bx.away.tov" :reason="why('tov')" color="red" />
        <StatBar label="Blocks" :home-value="bx.home.blk" :away-value="bx.away.blk" :reason="why('blk')" />
        <StatBar label="Fouls" :home-value="bx.home.pf" :away-value="bx.away.pf" :reason="why('pf')" color="yellow" />
        </div>

        <!-- Attendance & Referees -->
        <div v-if="bballMeta.attendance || bballMeta.referees" class="mt-6 pt-4 border-t border-edge">
          <div v-if="bballMeta.attendance" class="flex items-center justify-between text-sm text-zinc-400 mb-2">
            <span>Attendance</span>
            <span class="text-zinc-300 font-medium">{{ Number(bballMeta.attendance).toLocaleString() }}</span>
          </div>
          <div v-if="bballMeta.referees" class="text-sm text-zinc-400">
            <span>Referees: </span>
            <span class="text-zinc-300">{{ bballMeta.referees }}</span>
          </div>
        </div>
      </div>

      <!-- No stats fallback -->
      <div v-if="!isFootball && !hasBballStats" class="text-center py-8 text-zinc-500">
        <p class="text-sm">No box score is stored for this game.</p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { boxScore, fmtMadeAtt, hasBox, pctOf, type StatKey } from '~/utils/basketball-box'
import StatBar from './StatBar.vue'
import PossessionDonut from './PossessionDonut.vue'

const props = defineProps({
  game: {
    type: Object as () => Record<string, any>,
    required: true
  },
  sport: {
    type: String,
    default: 'football'
  }
})

const isFootball = computed(() => props.sport === 'football')

// The hero row renders only when at least one of its two panels has data —
// otherwise it would paint an empty grid above the stat stack.
const hasFootballHero = computed(() => {
  const g = props.game || {}
  const hasPossession = g.home_possession != null && g.away_possession != null
  return hasPossession || hasShootingStats.value || hasPassingStats.value
})

/** width of the home half of a two-sided ratio bar, in percent */
const split = (home: unknown, away: unknown) => {
  const h = Number(home) || 0
  const a = Number(away) || 0
  return h + a === 0 ? 50 : Math.round((h / (h + a)) * 100)
}

import { getTeamLogoUrl } from '~/utils/teamLogo'
import { VIZ_HOME, VIZ_AWAY } from '~/utils/viz'

const homeLogo = computed(() => getTeamLogoUrl(props.game.home_key))
const awayLogo = computed(() => getTeamLogoUrl(props.game.away_key))

const bx = computed(() => boxScore(props.game.sport_stats, { home: props.game.home_goals, away: props.game.away_goals }))

const hasBballStats = computed(() => hasBox(bx.value))

const bballMeta = computed(() => ({
  attendance: props.game.sport_stats?.attendance,
  referees: props.game.sport_stats?.referees,
}))

/** The reason for a dash: the first side that is missing the stat. */
const why = (stat: StatKey) => {
  const side = bx.value.home[stat as 'reb'] == null ? 'home' : 'away'
  return bx.value.reason(side, stat)
}

/** What the reader needs to know about how complete the numbers are. */
const boxNotes = computed(() => {
  const notes: string[] = []
  for (const p of bx.value.partial) {
    notes.push(`${p.side === 'home' ? props.game.home_name : props.game.away_name}: player rows cover ${p.have} of ${p.of} points`)
  }
  const fixed = bx.value.home.repairedRows + bx.value.away.repairedRows
  if (fixed) notes.push(`${fixed} player ${fixed === 1 ? 'row has' : 'rows have'} made and attempted swapped in the feed, corrected from points`)
  return notes
})

const SHOTS: { key: 'fg2' | 'fg3' | 'ft'; label: string }[] = [
  { key: 'fg2', label: '2PT Field Goals' },
  { key: 'fg3', label: '3PT Field Goals' },
  { key: 'ft', label: 'Free Throws' },
]

const shootingStats = computed(() => SHOTS.map(({ key, label }) => ({
  key,
  label,
  homeText: fmtMadeAtt(bx.value.home[key]),
  awayText: fmtMadeAtt(bx.value.away[key]),
  homePct: pctOf(bx.value.home[key]),
  awayPct: pctOf(bx.value.away[key]),
})))

const hasShootingStats = computed(() => {
  return props.game.home_shots != null && 
         props.game.away_shots != null && 
         props.game.home_shots_on_target != null && 
         props.game.away_shots_on_target != null &&
         props.game.home_shots > 0 && 
         props.game.away_shots > 0
})

const homeAccuracy = computed(() => {
  if (!hasShootingStats.value) return 0
  return Math.round((props.game.home_shots_on_target / props.game.home_shots) * 100)
})

const awayAccuracy = computed(() => {
  if (!hasShootingStats.value) return 0
  return Math.round((props.game.away_shots_on_target / props.game.away_shots) * 100)
})

const hasPassingStats = computed(() => {
  return props.game.home_passes_attempted != null && 
         props.game.away_passes_attempted != null && 
         props.game.home_passes_completed != null && 
         props.game.away_passes_completed != null &&
         props.game.home_passes_attempted > 0 && 
         props.game.away_passes_attempted > 0
})

const homePassAccuracy = computed(() => {
  if (!hasPassingStats.value) return 0
  return Math.round((props.game.home_passes_completed / props.game.home_passes_attempted) * 100)
})

const awayPassAccuracy = computed(() => {
  if (!hasPassingStats.value) return 0
  return Math.round((props.game.away_passes_completed / props.game.away_passes_attempted) * 100)
})
</script>
