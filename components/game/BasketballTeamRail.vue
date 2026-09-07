<template>
  <div class="space-y-3">
    <!-- Shooting -->
    <section v-if="totals && totals.fga > 0" class="panel overflow-hidden">
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
 * Basketball team totals are not stored as columns at all; they are derived
 * from `sport_stats.<side>.players[]`, which 20,141 of 23,703 completed
 * basketball fixtures carry. That is the same source `MatchStatistics` already
 * sums, which is why the centre of the page had numbers while the sides did not.
 */
import { computed } from 'vue'
import { VIZ_STATUS, VIZ_BRAND_HOME } from '~/utils/viz'
import PlayerShootingZones from '~/components/player/ShootingZones.vue'
import UiTooltip from '~/components/ui/Tooltip.vue'

const props = defineProps<{
  sportStats: any
  side: 'home' | 'away'
  teamName: string
}>()

const num = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Sum a side's box score. Keys vary by source, so every read is a coalesce. */
function sumSide(side: 'home' | 'away') {
  const players = props.sportStats?.[side]?.players
  if (!Array.isArray(players) || !players.length) return null
  const t = {
    pts: 0, reb: 0, oreb: 0, dreb: 0, ast: 0, tov: 0,
    fgm: 0, fga: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0,
  }
  for (const p of players) {
    t.pts += num(p.pts ?? p.points)
    t.reb += num(p.reb ?? p.rebounds)
    t.oreb += num(p.oreb ?? p.offensive_rebounds)
    t.dreb += num(p.dreb ?? p.defensive_rebounds)
    t.ast += num(p.ast ?? p.assists)
    t.tov += num(p.tov ?? p.to ?? p.turnovers)
    t.fg3m += num(p.fg3m ?? p.three_pointers_made)
    t.fg3a += num(p.fg3a ?? p.three_pointers_attempted)
    t.ftm += num(p.ftm ?? p.free_throws_made)
    t.fta += num(p.fta ?? p.free_throws_attempted)
    // Some sources give FGM including threes, others only twos — the sum of
    // 2PT and 3PT is the reliable reconstruction when `fgm` is absent.
    t.fgm += num(p.fgm ?? p.field_goals_made ?? (num(p.fg2m) + num(p.fg3m)))
    t.fga += num(p.fga ?? p.field_goals_attempted ?? (num(p.fg2a) + num(p.fg3a)))
  }
  return t
}

const totals = computed(() => sumSide(props.side))
const oppTotals = computed(() => sumSide(props.side === 'home' ? 'away' : 'home'))

const pct = (made: number, att: number) => (att > 0 ? (100 * made) / att : null)

function zonesOf(t: any) {
  if (!t) return null
  return {
    '2PT': { made: t.fgm - t.fg3m, att: t.fga - t.fg3a },
    '3PT': { made: t.fg3m, att: t.fg3a },
    FT: { made: t.ftm, att: t.fta },
  } as Record<string, { made: number; att: number }>
}

const zones = computed(() => {
  const mine = zonesOf(totals.value)
  const theirs = zonesOf(oppTotals.value)
  if (!mine) return []
  return (['2PT', '3PT', 'FT'] as const).map((z) => ({
    zone: z,
    made: mine[z].made,
    att: mine[z].att,
    pct: pct(mine[z].made, mine[z].att),
    // The reference is the OTHER team in this game — the only comparison a
    // single fixture honestly supports.
    cohortMedian: theirs ? pct(theirs[z].made, theirs[z].att) : null,
    percentile: null,
  }))
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

const factors = computed(() => {
  const t = totals.value
  const o = oppTotals.value
  if (!t || !o) return []

  const efg = (x: any) => (x.fga > 0 ? (100 * (x.fgm + 0.5 * x.fg3m)) / x.fga : null)
  const tovPct = (x: any) => {
    const poss = x.fga + 0.44 * x.fta + x.tov
    return poss > 0 ? (100 * x.tov) / poss : null
  }
  // ORB% needs the opponent's defensive rebounds — a rebound is contested.
  const orbPct = (x: any, y: any) => {
    const d = x.oreb + y.dreb
    return d > 0 ? (100 * x.oreb) / d : null
  }
  const ftRate = (x: any) => (x.fga > 0 ? (100 * x.fta) / x.fga : null)

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
