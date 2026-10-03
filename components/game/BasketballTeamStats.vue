<template>
  <section class="panel overflow-hidden" :data-testid="`bball-team-stats-${side}`">
    <header class="panel-head">
      <span class="panel-title">Team stats</span>
      <span class="pill" :class="side === 'home' ? 'pill-blue' : 'pill-red'">{{ teamName }}</span>
      <span v-if="notes.length" class="pill pill-amber" :title="notes.join(' · ')" data-testid="box-notes">partial</span>
      <UiTooltip class="ml-auto" :width="300" placement="bottom">
        <span class="panel-link">how to read</span>
        <template #content>
          <p>
            This team's box score for the game. A figure in green beat the opposing team on that line (lower is
            better for turnovers and fouls); hover a tile for the opponent's figure.
          </p>
          <p class="mt-2">A dash means the feed carries no such stat for this game; it is never a zero.</p>
          <p v-for="n in notes" :key="n" class="mt-2">{{ n }}</p>
        </template>
      </UiTooltip>
    </header>

    <div class="ts">
      <UiTooltip v-for="t in tiles" :key="t.key" :width="210" class="ts-cell">
        <div class="ts-tile" :data-testid="`tile-${t.key}`">
          <span class="ts-k">{{ t.label }}</span>
          <span class="ts-v" :class="{ 'ts-mute': t.value === '—' }" :style="t.better ? { color: VIZ_STATUS.good } : undefined" data-testid="tile-value">{{ t.value }}</span>
          <span class="ts-sub">{{ t.sub }}</span>
        </div>
        <template #content>
          <div class="tip-title">{{ t.name }}</div>
          <div class="tip-row"><span class="tip-k">{{ teamName }}</span><span class="tip-v">{{ t.value }}</span></div>
          <div class="tip-row"><span class="tip-k">opponent</span><span class="tip-v tip-dim">{{ t.opp }}</span></div>
          <div v-if="t.value === '—'" class="tip-foot">{{ reason(t.key) }}</div>
        </template>
      </UiTooltip>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * One team's box-score totals as a grid of tiles, for the side rail of a completed basketball
 * game. Replaces the two-sided stat bars: with a column per team, each side shows its own numbers
 * and the opposing figure is in the tooltip.
 *
 * Every number comes from `utils/basketball-box`, like the court in the centre, so they agree.
 */
import { computed } from 'vue'
import { VIZ_STATUS } from '~/utils/viz'
import { boxScore, fmtMadeAtt, pctOf, type BoxSide, type Shooting, type StatKey } from '~/utils/basketball-box'
import UiTooltip from '~/components/ui/Tooltip.vue'

const props = defineProps<{
  sportStats: any
  side: 'home' | 'away'
  teamName: string
  /** The final score, to say when player rows do not add up to it. */
  score?: { home: unknown; away: unknown } | null
}>()

const box = computed(() => boxScore(props.sportStats, props.score ?? null))
const mine = computed(() => box.value[props.side])
const theirs = computed(() => box.value[props.side === 'home' ? 'away' : 'home'])

type Key = 'fg' | StatKey

interface Spec { key: Key; label: string; name: string; lowerIsBetter?: boolean }
const SPECS: Spec[] = [
  { key: 'fg', label: 'FG', name: 'Field goals' },
  { key: 'fg2', label: '2PT', name: 'Two-point field goals' },
  { key: 'fg3', label: '3PT', name: 'Three-point field goals' },
  { key: 'ft', label: 'FT', name: 'Free throws' },
  { key: 'reb', label: 'REB', name: 'Total rebounds' },
  { key: 'oreb', label: 'OREB', name: 'Offensive rebounds' },
  { key: 'dreb', label: 'DREB', name: 'Defensive rebounds' },
  { key: 'ast', label: 'AST', name: 'Assists' },
  { key: 'stl', label: 'STL', name: 'Steals' },
  { key: 'blk', label: 'BLK', name: 'Blocks' },
  { key: 'tov', label: 'TOV', name: 'Turnovers', lowerIsBetter: true },
  { key: 'pf', label: 'PF', name: 'Fouls', lowerIsBetter: true },
]

/** Made/attempted for a shooting line, a count otherwise; `null` when the feed has none. */
function read(b: BoxSide, key: Key): { shot: Shooting | null; n: number | null; isShot: boolean } {
  if (key === 'fg') return { shot: b.fgm != null && b.fga != null ? { made: b.fgm, att: b.fga } : null, n: null, isShot: true }
  if (key === 'fg2' || key === 'fg3' || key === 'ft') return { shot: b[key], n: null, isShot: true }
  return { shot: null, n: b[key], isShot: false }
}

const text = (r: ReturnType<typeof read>) => (r.isShot ? fmtMadeAtt(r.shot) : r.n == null ? '—' : String(r.n))
/** The comparable figure: a rate for shooting, the count otherwise. */
const num = (r: ReturnType<typeof read>) => (r.isShot ? (r.shot && r.shot.att > 0 ? r.shot.made / r.shot.att : null) : r.n)

const tiles = computed(() => SPECS.map((s) => {
  const a = read(mine.value, s.key)
  const o = read(theirs.value, s.key)
  const av = num(a)
  const ov = num(o)
  const better = av != null && ov != null && av !== ov && (s.lowerIsBetter ? av < ov : av > ov)
  const pct = a.isShot ? pctOf(a.shot) : null
  return {
    key: s.key,
    label: s.label,
    name: s.name,
    value: text(a),
    sub: a.isShot ? (pct == null ? '' : `${pct}%`) : '',
    opp: text(o),
    better,
  }
}))

const notes = computed(() => {
  const out: string[] = []
  const p = box.value.partial.find((x) => x.side === props.side)
  if (p) out.push(`Player rows cover ${p.have} of ${p.of} points, so these totals are short of the whole team.`)
  if (mine.value.repairedRows) {
    const n = mine.value.repairedRows
    out.push(`${n} player ${n === 1 ? 'row has' : 'rows have'} made and attempted swapped in the feed, corrected from points.`)
  }
  return out
})

const reason = (key: Key) => box.value.reason(props.side, key === 'fg' ? 'fg2' : key)
</script>

<style scoped>
.ts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  background: var(--edge-soft);
}
.ts-cell { display: block; background: var(--surface); }
.ts-tile {
  display: flex; flex-direction: column; align-items: center;
  padding: 0.4rem 0.2rem 0.35rem;
  cursor: help;
}
.ts-k {
  font-size: 0.6rem; font-weight: 700; color: var(--ink-mute);
  text-transform: uppercase; letter-spacing: 0.05em;
}
.ts-v {
  font-size: 0.95rem; font-weight: 800; color: var(--ink-strong);
  font-variant-numeric: tabular-nums; line-height: 1.25;
}
.ts-mute { color: var(--ink-faint); }
.ts-sub { font-size: 0.6rem; color: var(--ink-mute); font-variant-numeric: tabular-nums; min-height: 0.8rem; }

.tip-title { font-weight: 700; color: var(--ink-strong); margin-bottom: 0.25rem; }
.tip-row { display: flex; justify-content: space-between; gap: 1rem; }
.tip-k { color: var(--ink-mute); }
.tip-v { font-weight: 700; font-variant-numeric: tabular-nums; }
.tip-dim { color: var(--ink-soft); }
.tip-foot {
  margin-top: 0.3rem; padding-top: 0.3rem;
  border-top: 1px solid var(--edge);
  color: var(--ink-faint); font-size: 0.6rem;
}
</style>
