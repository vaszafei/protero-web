<template>
  <div>
    <div class="space-y-4">
      <!-- Possession (football only) -->
      <StatBar 
        v-if="isFootball && game.home_possession != null && game.away_possession != null"
        label="Possession"
        :home-value="game.home_possession"
        :away-value="game.away_possession"
        suffix="%"
      />

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

      <!-- Basketball Stats from sport_stats -->
      <div v-if="!isFootball && hasBballStats">
        <!-- Quarter Scores -->
        <div v-if="quarters" class="mb-4">
          <div class="overflow-x-auto">
            <table class="w-full text-center text-sm">
              <thead>
                <tr>
                  <th class="text-left pb-2.5 w-9"></th>
                  <th
                    v-for="(_, i) in quarters" :key="i"
                    class="pb-2.5 px-1 text-xs font-semibold"
                    :class="i >= 4 ? 'text-amber-400' : 'text-zinc-400'"
                  >{{ i < 4 ? 'Q' + (i + 1) : 'OT' + (i - 3) }}</th>
                  <th class="pb-2.5 px-1 text-xs font-bold text-zinc-300">T</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="py-1.5 pr-2">
                    <img v-if="homeLogo" :src="homeLogo" class="w-7 h-7 object-contain" :alt="game.home_name" @error="(e) => e.target.style.display='none'" />
                    <span v-else class="text-zinc-300 text-xs font-bold">{{ game.home_name?.split(' ').pop()?.slice(0, 3) }}</span>
                  </td>
                  <td
                    v-for="(q, i) in quarters" :key="'h'+i"
                    class="py-1.5 px-1 tabular-nums font-semibold"
                    :class="q[0] > q[1] ? 'text-zinc-100' : 'text-zinc-500'"
                  >{{ q[0] }}</td>
                  <td class="py-1.5 px-1 tabular-nums font-bold text-zinc-100">{{ game.home_goals }}</td>
                </tr>
                <tr>
                  <td class="py-1.5 pr-2">
                    <img v-if="awayLogo" :src="awayLogo" class="w-7 h-7 object-contain" :alt="game.away_name" @error="(e) => e.target.style.display='none'" />
                    <span v-else class="text-zinc-300 text-xs font-bold">{{ game.away_name?.split(' ').pop()?.slice(0, 3) }}</span>
                  </td>
                  <td
                    v-for="(q, i) in quarters" :key="'a'+i"
                    class="py-1.5 px-1 tabular-nums font-semibold"
                    :class="q[1] > q[0] ? 'text-zinc-100' : 'text-zinc-500'"
                  >{{ q[1] }}</td>
                  <td class="py-1.5 px-1 tabular-nums font-bold text-zinc-100">{{ game.away_goals }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="quarters" class="border-t border-edge my-2" />

        <!-- Shooting (made/attempted with inline percentage) -->
        <div class="space-y-0">
        <div v-for="shot in shootingStats" :key="shot.label" class="py-1.5">
          <div class="text-center text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-1">
            {{ shot.label }}
          </div>
          <div class="grid grid-cols-[64px_1fr_64px] items-center gap-2">
            <div class="text-right">
              <span class="text-[13px] font-semibold text-[#e8a0a0] tabular-nums">{{ shot.homeMade }}/{{ shot.homeAtt }}</span>
              <span class="block text-[10px] text-zinc-500 tabular-nums">{{ shot.homePct }}%</span>
            </div>
            <div class="flex items-center gap-0">
              <div class="flex-1 h-[5px] bg-surface-light/60 rounded-l-full overflow-hidden flex justify-end">
                <div class="h-full rounded-l-full bg-gradient-to-l from-[#f82828]/60 to-[#f82828]/30" :style="{ width: shot.homePct + '%' }" />
              </div>
              <div class="w-px h-3 bg-zinc-600/60 flex-shrink-0" />
              <div class="flex-1 h-[5px] bg-surface-light/60 rounded-r-full overflow-hidden">
                <div class="h-full rounded-r-full bg-gradient-to-r from-[#0848a8]/30 to-[#0848a8]/60" :style="{ width: shot.awayPct + '%' }" />
              </div>
            </div>
            <div class="text-left">
              <span class="text-[13px] font-semibold text-[#a0b8e8] tabular-nums">{{ shot.awayMade }}/{{ shot.awayAtt }}</span>
              <span class="block text-[10px] text-zinc-500 tabular-nums">{{ shot.awayPct }}%</span>
            </div>
          </div>
        </div>
        </div>

        <div class="border-t border-edge my-3" />

        <!-- Rebounds -->
        <div class="space-y-0">
        <StatBar label="Total Rebounds" :home-value="bball.home.total_reb" :away-value="bball.away.total_reb" />
        <StatBar label="Offensive Reb" :home-value="bball.home.off_reb" :away-value="bball.away.off_reb" />
        <StatBar label="Defensive Reb" :home-value="bball.home.def_reb" :away-value="bball.away.def_reb" />
        </div>

        <div class="border-t border-edge my-3" />

        <!-- Playmaking & Turnovers -->
        <div class="space-y-0">
        <StatBar label="Assists" :home-value="bball.home.assists" :away-value="bball.away.assists" />
        <StatBar label="Steals" :home-value="bball.home.steals" :away-value="bball.away.steals" />
        <StatBar label="Turnovers" :home-value="bball.home.turnovers" :away-value="bball.away.turnovers" color="red" />
        <StatBar label="Blocks" :home-value="bball.home.blocks_for || 0" :away-value="bball.away.blocks_for || 0" />
        <StatBar label="Fouls" :home-value="bball.home.fouls" :away-value="bball.away.fouls" color="yellow" />
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
        <p class="text-sm">Game statistics will be available after the game is completed.</p>
      </div>

      <!-- Additional Stats Section (football only) -->
      <div v-if="isFootball && (hasShootingStats || hasPassingStats)" class="mt-6 pt-6 border-t border-edge space-y-3">
        <!-- Shot Accuracy -->
        <div v-if="hasShootingStats">
          <div class="flex items-center justify-between text-sm mb-2">
            <span class="font-semibold text-zinc-300">{{ homeAccuracy }}%</span>
            <span class="text-zinc-400">Shot Accuracy</span>
            <span class="font-semibold text-zinc-300">{{ awayAccuracy }}%</span>
          </div>
          <div class="text-center text-xs text-zinc-500">
            (Shots on Target / Total Shots)
          </div>
        </div>

        <!-- Pass Accuracy -->
        <div v-if="hasPassingStats">
          <div class="flex items-center justify-between text-sm mb-2">
            <span class="font-semibold text-zinc-300">{{ homePassAccuracy }}%</span>
            <span class="text-zinc-400">Pass Accuracy</span>
            <span class="font-semibold text-zinc-300">{{ awayPassAccuracy }}%</span>
          </div>
          <div class="text-center text-xs text-zinc-500">
            ({{ game.home_passes_completed }}/{{ game.home_passes_attempted }} - {{ game.away_passes_completed }}/{{ game.away_passes_attempted }})
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import StatBar from './StatBar.vue'

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

const isFootball = computed(() => props.sport === 'football')

import { getTeamLogoUrl } from '~/utils/teamLogo'

const homeLogo = computed(() => getTeamLogoUrl(props.game.home_key))
const awayLogo = computed(() => getTeamLogoUrl(props.game.away_key))

// Aggregate team totals from per-player boxscore data (NBA API format)
function aggregateFromPlayers(players) {
  if (!players?.length) return null
  const t = { fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0,
               reb: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, tov: 0, blk: 0, pf: 0 }
  for (const p of players) {
    t.fgm  += p.field_goals_made ?? 0
    t.fga  += p.field_goals_attempted ?? 0
    t.fg3m += p.three_pointers_made ?? 0
    t.fg3a += p.three_pointers_attempted ?? 0
    t.ftm  += p.free_throws_made ?? 0
    t.fta  += p.free_throws_attempted ?? 0
    t.reb  += p.rebounds ?? 0
    t.oreb += p.offensive_rebounds ?? 0
    t.dreb += p.defensive_rebounds ?? 0
    t.ast  += p.assists ?? 0
    t.stl  += p.steals ?? 0
    t.tov  += p.turnovers ?? 0
    t.blk  += p.blocks ?? 0
    t.pf   += p.personal_fouls ?? 0
  }
  return t
}

// Normalize basketball stats — Euroleague uses long names, NBA uses short names
function normalizeBballSide(raw) {
  if (!raw) return {}
  // If already has long names (Euroleague format), return as-is
  if ('fg2_made' in raw) return raw
  // NBA FlashScore format: short aggregate names
  if ('fgm' in raw) {
    return {
      fg2_made: (raw.fgm ?? 0) - (raw.fg3m ?? 0),
      fg2_att:  (raw.fga ?? 0) - (raw.fg3a ?? 0),
      fg3_made: raw.fg3m ?? 0,
      fg3_att:  raw.fg3a ?? 0,
      ft_made:  raw.ftm ?? 0,
      ft_att:   raw.fta ?? 0,
      total_reb: raw.reb ?? 0,
      off_reb:  raw.oreb ?? 0,
      def_reb:  raw.dreb ?? 0,
      assists:  raw.ast ?? 0,
      steals:   raw.stl ?? 0,
      turnovers: raw.tov ?? 0,
      blocks_for: raw.blk ?? 0,
      fouls:    raw.pf ?? 0,
      players:  raw.players,
      team:     raw.team,
    }
  }
  // NBA API boxscore format: only players array, aggregate team totals
  const agg = aggregateFromPlayers(raw.players)
  if (agg) {
    return {
      fg2_made: agg.fgm - agg.fg3m,
      fg2_att:  agg.fga - agg.fg3a,
      fg3_made: agg.fg3m,
      fg3_att:  agg.fg3a,
      ft_made:  agg.ftm,
      ft_att:   agg.fta,
      total_reb: agg.reb,
      off_reb:  agg.oreb,
      def_reb:  agg.dreb,
      assists:  agg.ast,
      steals:   agg.stl,
      turnovers: agg.tov,
      blocks_for: agg.blk,
      fouls:    agg.pf,
      players:  raw.players,
    }
  }
  return {}
}

const bball = computed(() => ({
  home: normalizeBballSide(props.game.sport_stats?.home),
  away: normalizeBballSide(props.game.sport_stats?.away),
}))

const hasBballStats = computed(() => {
  const ss = props.game.sport_stats
  if (!ss) return false
  // Has FlashScore team stats
  const h = ss.home
  if (h && (('fg2_made' in h) || ('fgm' in h))) return true
  // Has NBA API boxscore players (can aggregate)
  if (h?.players?.length > 0) return true
  // Has at least quarter scores from NBA API
  if (ss.quarters?.home?.length > 0) return true
  return false
})

const quarters = computed(() => {
  const q = props.game.sport_stats?.quarters
  if (!q) return null

  // NBA API format: { home: [30,27,28,41], away: [34,28,20,40] }
  if (Array.isArray(q.home) && Array.isArray(q.away)) {
    return q.home.map((h, i) => [h, q.away[i] ?? 0])
  }

  // FlashScore format: { q1: [h,a], q2: [h,a], ... }
  const arr = []
  for (let i = 1; i <= 4; i++) {
    if (q['q' + i]) arr.push(q['q' + i])
  }
  for (let i = 1; i <= 5; i++) {
    if (q['ot' + i]) arr.push(q['ot' + i])
  }
  return arr.length ? arr : null
})

const bballMeta = computed(() => ({
  attendance: props.game.sport_stats?.attendance,
  referees: props.game.sport_stats?.referees,
}))

const pct = (made, att) => att > 0 ? Math.round((made / att) * 100) : 0

const bballFg2Pct = computed(() => ({
  home: pct(bball.value.home.fg2_made, bball.value.home.fg2_att),
  away: pct(bball.value.away.fg2_made, bball.value.away.fg2_att),
}))

const bballFg3Pct = computed(() => ({
  home: pct(bball.value.home.fg3_made, bball.value.home.fg3_att),
  away: pct(bball.value.away.fg3_made, bball.value.away.fg3_att),
}))

const bballFtPct = computed(() => ({
  home: pct(bball.value.home.ft_made, bball.value.home.ft_att),
  away: pct(bball.value.away.ft_made, bball.value.away.ft_att),
}))

const shootingStats = computed(() => [
  {
    label: '2PT Field Goals',
    homeMade: bball.value.home.fg2_made ?? 0,
    homeAtt: bball.value.home.fg2_att ?? 0,
    awayMade: bball.value.away.fg2_made ?? 0,
    awayAtt: bball.value.away.fg2_att ?? 0,
    homePct: bballFg2Pct.value.home,
    awayPct: bballFg2Pct.value.away,
  },
  {
    label: '3PT Field Goals',
    homeMade: bball.value.home.fg3_made ?? 0,
    homeAtt: bball.value.home.fg3_att ?? 0,
    awayMade: bball.value.away.fg3_made ?? 0,
    awayAtt: bball.value.away.fg3_att ?? 0,
    homePct: bballFg3Pct.value.home,
    awayPct: bballFg3Pct.value.away,
  },
  {
    label: 'Free Throws',
    homeMade: bball.value.home.ft_made ?? 0,
    homeAtt: bball.value.home.ft_att ?? 0,
    awayMade: bball.value.away.ft_made ?? 0,
    awayAtt: bball.value.away.ft_att ?? 0,
    homePct: bballFtPct.value.home,
    awayPct: bballFtPct.value.away,
  },
])

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
