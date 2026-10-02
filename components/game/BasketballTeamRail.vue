<template>
  <div class="space-y-3">
    <!-- Shooting -->
    <section v-if="hasZones" class="panel overflow-hidden" data-testid="bball-rail-shooting">
      <header class="panel-head">
        <span class="panel-title">Shooting</span>
        <span class="pill" :class="side === 'home' ? 'pill-blue' : 'pill-red'">{{ teamName }}</span>
      </header>
      <div class="p-2.5 sm:p-3">
        <PlayerShootingZones
          :zones="zones"
          ref-label="opponent"
          :note="courtNote"
        />
      </div>
    </section>

    <!-- Four factors -->
    <section v-if="factors.length" class="panel overflow-hidden">
      <header class="panel-head">
        <span class="panel-title">Four factors</span>
        <span class="panel-link">vs opponent</span>
      </header>
      <div class="ff">
        <div v-for="f in factors" :key="f.key" class="ff-row">
          <UiTooltip :width="270">
            <span class="ff-k">{{ f.label }}</span>
            <template #content>
              <div class="tip-title">{{ f.label }}</div>
              <div class="tip-row"><span class="tip-k">{{ teamName }}</span><span class="tip-v" :style="{ color: f.color }">{{ f.text }}</span></div>
              <div class="tip-row"><span class="tip-k">opponent</span><span class="tip-v tip-dim">{{ f.oppText }}</span></div>
              <div class="tip-foot">{{ f.note }}</div>
            </template>
          </UiTooltip>
          <span class="ff-bar">
            <span class="ff-fill grow-x" :style="{ width: `${f.pct}%`, background: f.color }" />
            <span class="ff-ref" :style="{ left: `${f.oppPct}%` }" />
          </span>
          <span class="ff-v" :style="{ color: f.color }">{{ f.text }}</span>
        </div>
      </div>
      <p class="ff-note">
        The notch is the opposing team in this game and the bar is raw magnitude, so
        <strong>colour</strong> carries better-or-worse — green is the better of the two.
        Four factors are the standard decomposition of a basketball result: shoot well,
        avoid turnovers, rebound your misses, get to the line.
      </p>
    </section>

  </div>
</template>

<script setup lang="ts">
/**
 * One team's side rail on a completed basketball game.
 *
 * What was here before: `TeamStatsRail`, which reads the football scalar
 * columns (`home_shots`, `home_corners`, `home_possession_pct`). Those are NULL
 * for every basketball fixture — the migration that split the sports NULLed
 * them deliberately — so both rails rendered "No stats recorded" and ate half
 * the width of the page.
 *
 * Basketball team totals are not stored as columns at all. They come from
 * `utils/basketball-box`, the one reader of `sport_stats` that `MatchStatistics`
 * and `BasketballPlayerStats` also use, so the three cannot disagree (#58).
 */
import { computed } from 'vue'
import { VIZ_STATUS, VIZ_BRAND_HOME } from '~/utils/viz'
import { boxScore, type BoxSide } from '~/utils/basketball-box'
import PlayerShootingZones from '~/components/player/ShootingZones.vue'
import UiTooltip from '~/components/ui/Tooltip.vue'

const props = defineProps<{
  sportStats: any
  side: 'home' | 'away'
  teamName: string
}>()

const box = computed(() => boxScore(props.sportStats))
const mine = computed(() => box.value[props.side])
const theirs = computed(() => box.value[props.side === 'home' ? 'away' : 'home'])

/** The zone panel needs all three splits; any the feed lacks hides it rather than drawing a 0. */
const hasZones = computed(() => !!(mine.value.fg2 && mine.value.fg3 && mine.value.ft))

const pct = (made: number, att: number) => (att > 0 ? (100 * made) / att : null)

const zones = computed(() => {
  const m = mine.value
  const o = theirs.value
  if (!m.fg2 || !m.fg3 || !m.ft) return []
  const cells = { '2PT': [m.fg2, o.fg2], '3PT': [m.fg3, o.fg3], FT: [m.ft, o.ft] } as const
  return (['2PT', '3PT', 'FT'] as const).map((z) => {
    const [own, opp] = cells[z]
    return {
      zone: z,
      made: own.made,
      att: own.att,
      pct: pct(own.made, own.att),
      // The reference is the OTHER team in this game — the only comparison a
      // single fixture honestly supports.
      cohortMedian: opp ? pct(opp.made, opp.att) : null,
      percentile: null,
    }
  })
})

// These are the BOXSCORE's zone totals, which every basketball fixture has.
// Per-shot coordinates are a different feed and exist only where the shot
// backfill has run (EuroLeague 2025-2026), so this panel does not depend on
// them — where they do exist the Shot Chart tab plots them individually.
const courtNote = computed(() =>
  'Zone totals for this game, not a shot chart — these are makes and attempts per zone, not individual shot locations. Shading compares each zone with the opposing team in this fixture.'
)

interface Factor {
  key: string; label: string; value: number | null; opp: number | null
  suffix: string; note: string; higherIsBetter: boolean
}

/** The terms the four factors are built from. All of them must be in the feed, or there is no factor. */
interface Terms { fgm: number; fga: number; fg3m: number; ftm: number; fta: number; tov: number; oreb: number; dreb: number }

function termsOf(x: BoxSide): Terms | null {
  const fg3m = x.fg3?.made
  const fta = x.ft?.att
  const ftm = x.ft?.made
  if (x.fgm == null || x.fga == null || fg3m == null || fta == null || ftm == null || x.tov == null || x.oreb == null || x.dreb == null) return null
  return { fgm: x.fgm, fga: x.fga, fg3m, ftm, fta, tov: x.tov, oreb: x.oreb, dreb: x.dreb }
}

const factors = computed(() => {
  const t = termsOf(mine.value)
  const o = termsOf(theirs.value)
  if (!t || !o) return []

  const efg = (x: Terms) => (x.fga > 0 ? (100 * (x.fgm + 0.5 * x.fg3m)) / x.fga : null)
  const tovPct = (x: Terms) => {
    const poss = x.fga + 0.44 * x.fta + x.tov
    return poss > 0 ? (100 * x.tov) / poss : null
  }
  // ORB% needs the opponent's defensive rebounds — a rebound is contested.
  const orbPct = (x: Terms, y: Terms) => {
    const d = x.oreb + y.dreb
    return d > 0 ? (100 * x.oreb) / d : null
  }
  const ftRate = (x: Terms) => (x.fga > 0 ? (100 * x.fta) / x.fga : null)

  const specs: Factor[] = [
    { key: 'efg', label: 'eFG%', value: efg(t), opp: efg(o), suffix: '%', higherIsBetter: true,
      note: '(FGM + 0.5 × 3PM) / FGA — field-goal percentage that credits the extra point a three is worth.' },
    { key: 'tov', label: 'TOV%', value: tovPct(t), opp: tovPct(o), suffix: '%', higherIsBetter: false,
      note: 'Turnovers per possession. This is the one factor where LOWER is better — the bar is raw magnitude, so read the colour, not the length.' },
    { key: 'orb', label: 'ORB%', value: orbPct(t, o), opp: orbPct(o, t), suffix: '%', higherIsBetter: true,
      note: 'Share of available offensive rebounds won — measured against the opponent’s defensive rebounds, since a rebound is contested.' },
    { key: 'ftr', label: 'FT rate', value: ftRate(t), opp: ftRate(o), suffix: '%', higherIsBetter: true,
      note: 'Free-throw attempts per field-goal attempt — how often this team got to the line.' },
  ]

  return specs
    .filter((s) => s.value != null && s.opp != null)
    .map((s) => {
      const v = s.value as number
      const opp = s.opp as number
      const better = s.higherIsBetter ? v > opp : v < opp
      // A shared 0-100 scale would leave TOV% and ORB% as stubs, so each bar is
      // scaled to the larger of the two teams' values plus headroom.
      const scale = Math.max(v, opp) * 1.25 || 1
      return {
        ...s,
        pct: Math.min(100, (v / scale) * 100),
        oppPct: Math.min(100, (opp / scale) * 100),
        text: `${v.toFixed(1)}${s.suffix}`,
        oppText: `${opp.toFixed(1)}${s.suffix}`,
        color: better ? VIZ_STATUS.good : VIZ_BRAND_HOME,
      }
    })
})

</script>

<style scoped>
.ff { padding: 0.5rem 0.7rem 0.2rem; }
.ff-row {
  display: grid;
  grid-template-columns: 3.5rem 1fr 3rem;
  align-items: center;
  gap: 0.45rem;
  padding: 0.22rem 0;
}
.ff-k {
  font-size: 0.6rem; font-weight: 700; color: var(--ink-mute);
  text-transform: uppercase; letter-spacing: 0.04em; cursor: help;
}
.ff-bar {
  position: relative;
  height: 6px;
  border-radius: var(--r-pill);
  background: rgba(255, 255, 255, 0.05);
}
.ff-fill {
  display: block; height: 100%; border-radius: var(--r-pill);
}
.ff-ref {
  position: absolute; top: -2px; bottom: -2px;
  width: 2px; margin-left: -1px;
  background: var(--ink-faint);
}
.ff-v {
  font-size: 0.66rem; font-weight: 700; text-align: right;
  font-variant-numeric: tabular-nums;
}
.ff-note {
  padding: 0.5rem 0.7rem 0.7rem;
  font-size: 0.57rem; line-height: 1.55; color: var(--ink-faint);
}
.ff-note strong { color: var(--ink-mute); font-weight: 600; }

.tip-title { font-weight: 700; color: var(--ink-strong); margin-bottom: 0.25rem; }
.tip-row { display: flex; justify-content: space-between; gap: 1rem; }
.tip-k { color: var(--ink-mute); }
.tip-v { font-weight: 700; font-variant-numeric: tabular-nums; }
.tip-dim { color: var(--ink-soft); }
.tip-foot {
  margin-top: 0.3rem; padding-top: 0.3rem;
  border-top: 1px solid var(--edge);
  color: var(--ink-faint); font-size: 0.58rem; line-height: 1.45;
}
</style>
