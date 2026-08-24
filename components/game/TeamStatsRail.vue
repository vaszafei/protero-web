<template>
  <div class="team-rail panel-glass rounded-lg overflow-hidden h-full" :class="{ 'team-rail--mirror': mirror }">
    <!-- Team identity -->
    <div
      class="flex items-center gap-2.5 px-3 sm:px-4 pt-3 pb-2.5"
      :class="mirror ? 'flex-row-reverse' : ''"
    >
      <div class="rail-glow">
        <img
          v-if="logo && !logoError"
          :src="logo"
          :alt="name"
          class="w-8 h-8 sm:w-9 sm:h-9 object-contain"
          @error="logoError = true"
        />
        <div v-else class="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border"
          :style="{ background: `${color}1f`, borderColor: `${color}33` }">
          <span class="text-[11px] font-extrabold" :style="{ color: `${color}b3` }">{{ abbr }}</span>
        </div>
      </div>
      <div class="min-w-0" :class="mirror ? 'text-right' : ''">
        <p class="text-xs sm:text-sm font-semibold text-zinc-200 truncate">{{ name }}</p>
        <p v-if="formation" class="text-[10px] text-zinc-500">{{ formation }}</p>
      </div>
    </div>

    <div class="h-px mx-3" :style="{ background: divider }" />

    <!-- Stat rows -->
    <div class="px-3 sm:px-4 py-2.5 space-y-2">
      <div v-for="row in rows" :key="row.label" class="rail-row">
        <div class="flex items-center justify-between gap-2" :class="mirror ? 'flex-row-reverse' : ''">
          <span class="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{{ row.label }}</span>
          <span class="text-sm font-bold tabular-nums" :style="{ color }">{{ row.display }}</span>
        </div>
        <div class="mt-1 h-1 rounded-full bg-surface-light/70 overflow-hidden" :class="mirror ? 'flex justify-end' : ''">
          <div
            class="h-full rounded-full rail-fill"
            :style="{ width: row.share + '%', background: `linear-gradient(90deg, ${color}99, ${color})` }"
          />
        </div>
      </div>

      <p v-if="rows.length === 0" class="text-[11px] text-zinc-600 text-center py-6">
        No stats recorded
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { VIZ_HOME, VIZ_AWAY } from '~/utils/viz'
import { getTeamLogoUrl, teamAbbreviation } from '~/utils/teamLogo'

const props = defineProps<{
  side: 'home' | 'away'
  game: Record<string, any>
  sport: string
  /** Render the rail mirrored — header/values anchored right, bars growing left. */
  mirror?: boolean
}>()

const color = computed(() => (props.side === 'home' ? VIZ_HOME : VIZ_AWAY))
const name = computed(() => (props.side === 'home' ? props.game?.home_name : props.game?.away_name) || '')
const key = computed(() => (props.side === 'home' ? props.game?.home_key : props.game?.away_key))
const formation = computed(() => (props.side === 'home' ? props.game?.home_formation : props.game?.away_formation))

const logoError = ref(false)
watch(() => props.game?.id, () => { logoError.value = false })

const logo = computed(() => getTeamLogoUrl(key.value))
const abbr = computed(() => teamAbbreviation(name.value))

// Divider fades away from the team side: left rail fades colour→transparent
// toward the scorecard, the mirrored rail the reverse.
const divider = computed(() =>
  props.mirror
    ? `linear-gradient(270deg, ${color.value}26, transparent)`
    : `linear-gradient(90deg, ${color.value}26, transparent)`
)

const g = (field: string): number | null => {
  const v = props.game?.[`${props.side}_${field}`]
  if (v == null) return null
  const n = Number(v)
  return isFinite(n) ? n : null
}

const other = (field: string): number | null => {
  const v = props.game?.[`${props.side === 'home' ? 'away' : 'home'}_${field}`]
  if (v == null) return null
  const n = Number(v)
  return isFinite(n) ? n : null
}

// This side's share of the two-sided total, for the one-sided meter.
function shareOf(mine: number | null, theirs: number | null): number {
  const m = mine ?? 0
  const t = theirs ?? 0
  const total = m + t
  if (total === 0) return 50
  const pct = Math.round((m / total) * 100)
  return Math.max(4, Math.min(100, pct))
}

// One row of the rail — the displayed value is this team's own, the meter is
// this team's share of the two-sided total.
interface Row { label: string; display: string; share: number }

const rows = computed<Row[]>(() => {
  if (props.sport !== 'football') return []
  const out: Row[] = []

  // 1. xG
  const xg = g('xg')
  if (xg != null) {
    out.push({ label: 'xG', display: xg.toFixed(2), share: shareOf(xg, other('xg')) })
  }

  // 2. Possession
  const poss = g('possession')
  if (poss != null) {
    out.push({ label: 'Possession', display: `${poss}%`, share: shareOf(poss, other('possession')) })
  }

  // 3. Shots — shots and on-target merged into one line.
  const shots = g('shots')
  if (shots != null) {
    const sot = g('shots_on_target')
    out.push({
      label: 'Shots',
      display: sot != null ? `${shots} (${sot} OT)` : `${shots}`,
      share: shareOf(shots, other('shots')),
    })
  }

  // 4. Big chances
  const big = g('big_chances')
  if (big != null) {
    out.push({ label: 'Big Chances', display: `${big}`, share: shareOf(big, other('big_chances')) })
  }

  // 5. Corners
  const corners = g('corners')
  if (corners != null) {
    out.push({ label: 'Corners', display: `${corners}`, share: shareOf(corners, other('corners')) })
  }

  // 6. Pass accuracy
  const completed = g('passes_completed')
  const attempted = g('passes_attempted')
  if (completed != null && attempted != null && attempted > 0) {
    const rate = Math.round((completed / attempted) * 100)
    out.push({ label: 'Pass Accuracy', display: `${rate}%`, share: rate })
  }

  // 7. Offsides
  const off = g('offsides')
  if (off != null) {
    out.push({ label: 'Offsides', display: `${off}`, share: shareOf(off, other('offsides')) })
  }

  // 8. Fouls
  const fouls = g('fouls')
  if (fouls != null) {
    out.push({ label: 'Fouls', display: `${fouls}`, share: shareOf(fouls, other('fouls')) })
  }

  // 9. Cards — yellow and red merged into one line.
  const yellow = g('yellow_cards')
  const red = g('red_cards')
  if (yellow != null || red != null) {
    const y = yellow ?? 0
    const r = red ?? 0
    out.push({
      label: 'Cards',
      display: red != null ? `${y}Y · ${r}R` : `${y}Y`,
      share: shareOf(yellow, other('yellow_cards')),
    })
  }

  // A completed game whose columns were never scraped holds 0 (not NULL) for
  // every counting stat. Rendering a stack of zero rows pretends we measured
  // a game we never saw — collapse it to the honest empty state instead.
  if (out.length > 0 && out.every(row => /^0(?:[ .].*)?$|^0%$|^0\.00$/.test(row.display))) {
    return []
  }
  return out
})
</script>

<style scoped>
.team-rail {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.02);
}
.rail-glow {
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.06));
}
.rail-row {
  min-height: 34px;
}
.rail-fill {
  transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: reduce) {
  .rail-fill { transition: none; }
}
</style>
