<template>
  <div class="panel">
    <div class="panel-head">
      <span class="panel-title">Match log</span>
      <span class="ml-count">{{ rows.length }}</span>
      <span class="panel-link">{{ season }}</span>
    </div>

    <!-- Form strip — the last N results, newest right. Each chip carries the
         whole fixture in a tooltip, which is the point: a row of coloured
         letters that cannot be interrogated is decoration. -->
    <div v-if="formChips.length" class="ml-form">
      <span class="ml-form-label">Form</span>
      <div class="ml-chips">
        <UiTooltip v-for="r in formChips" :key="r.game_id" :width="250">
          <NuxtLink :to="`/game/${r.game_id}`" class="chip-wdl" :class="chipClass(r)">
            {{ resultOf(r) }}
          </NuxtLink>
          <template #content>
            <div class="tip-title">
              {{ r.side === 'home' ? 'vs' : 'at' }} {{ r.opponent }}
            </div>
            <div class="tip-row">
              <span class="tip-k">{{ fmtDate(r.date) }}</span>
              <span class="tip-v">{{ r.gf ?? '—' }}–{{ r.ga ?? '—' }}</span>
            </div>
            <div v-for="s in tipStats(r)" :key="s.k" class="tip-row">
              <span class="tip-k">{{ s.k }}</span><span class="tip-v">{{ s.v }}</span>
            </div>
            <div class="tip-foot">{{ leagueLabel(r.league_key) }}<template v-if="r.round"> · round {{ r.round }}</template></div>
          </template>
        </UiTooltip>
      </div>
      <span class="ml-form-sum">{{ formSummary }}</span>
    </div>

    <div class="scroll-fade-x">
      <table class="ml-table">
        <thead>
          <tr>
            <th class="ml-th ml-left">Date</th>
            <th class="ml-th ml-left">Opponent</th>
            <th class="ml-th">Res</th>
            <th v-for="c in columns" :key="c.key" class="ml-th">{{ c.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.game_id" class="row-hover ml-row" @click="go(r)">
            <td class="ml-td ml-left ml-dim">{{ fmtDate(r.date) }}</td>
            <td class="ml-td ml-left">
              <span class="ml-side">{{ r.side === 'home' ? 'v' : '@' }}</span>
              <span class="ml-opp">{{ r.opponent }}</span>
            </td>
            <td class="ml-td">
              <span class="chip-wdl" :class="chipClass(r)">{{ resultOf(r) }}</span>
              <span class="ml-score">{{ r.gf ?? '—' }}–{{ r.ga ?? '—' }}</span>
            </td>
            <td
              v-for="c in columns"
              :key="c.key"
              class="ml-td ml-num"
              :class="{ 'ml-null': valueOf(r, c) == null }"
            >{{ display(r, c) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="!rows.length" class="ml-empty">
      No appearances recorded in {{ season }}.
    </p>
    <p v-else-if="anyNulls" class="ml-note">
      A dash is a stat this fixture was never scraped for, not a zero. Per-appearance detail
      exists from 2026-2027 onward; earlier seasons carry goals, assists and cards only.
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * The season's appearances, one row each, plus a form strip whose chips are
 * interrogable.
 *
 * Two rules the columns follow:
 *  - A missing stat renders as "—", never as 0. `lineups` has whole seasons
 *    where `minutes_played` was never scraped; printing 0 minutes for a player
 *    who played 90 is a lie the reader cannot detect.
 *  - The result chip is the letter AND the colour. Colour alone would fail a
 *    dichromat, and this table is read at a glance.
 */
import { computed } from 'vue'
import UiTooltip from '~/components/ui/Tooltip.vue'

interface Col { key: string; label: string; dp?: number }

const props = defineProps<{
  rows: any[]
  sport: 'football' | 'basketball'
  season: string
}>()

const router = useRouter()
const go = (r: any) => router.push(`/game/${r.game_id}`)

const FOOTBALL_COLS: Col[] = [
  { key: 'minutes_played', label: "Min" },
  { key: 'rating', label: 'Rtg', dp: 1 },
  { key: 'goals', label: 'G' },
  { key: 'assists', label: 'A' },
  { key: 'xg', label: 'xG', dp: 2 },
  { key: 'shots_total', label: 'Sh' },
  { key: 'shots_on_target', label: 'SoT' },
  { key: 'passes', label: 'Pas' },
  { key: 'pass_accuracy', label: 'Pas%', dp: 0 },
  { key: 'tackles', label: 'Tkl' },
  { key: 'touches_in_box', label: 'Box' },
  { key: 'duels', label: 'Duel' },
]

const BASKETBALL_COLS: Col[] = [
  { key: 'minutes', label: 'Min', dp: 0 },
  { key: 'points', label: 'PTS' },
  { key: 'rebounds', label: 'REB' },
  { key: 'assists', label: 'AST' },
  { key: 'steals', label: 'STL' },
  { key: 'blocks', label: 'BLK' },
  { key: 'turnovers', label: 'TOV' },
  { key: 'plus_minus', label: '+/-' },
  { key: 'field_goals_made', label: 'FGM' },
  { key: 'field_goals_attempted', label: 'FGA' },
  { key: 'three_pointers_made', label: '3PM' },
  { key: 'free_throws_made', label: 'FTM' },
]

const columns = computed(() => (props.sport === 'basketball' ? BASKETBALL_COLS : FOOTBALL_COLS))

const valueOf = (r: any, c: Col) => {
  const v = r?.[c.key]
  return v == null || v === '' ? null : Number(v)
}

function display(r: any, c: Col): string {
  const v = valueOf(r, c)
  if (v == null || Number.isNaN(v)) return '—'
  // `lineups.pass_accuracy` is a 0..1 fraction in the raw row.
  if (c.key === 'pass_accuracy') return `${Math.round(v * 100)}`
  return c.dp != null ? v.toFixed(c.dp) : String(Math.round(v))
}

function resultOf(r: any): string {
  if (r.gf == null || r.ga == null) return '·'
  if (r.gf > r.ga) return 'W'
  if (r.gf < r.ga) return 'L'
  return 'D'
}

const chipClass = (r: any) =>
  ({ W: 'chip-w', D: 'chip-d', L: 'chip-l' }[resultOf(r)] || 'chip-pending')

/** Oldest → newest, so the strip reads left to right like a calendar. */
const formChips = computed(() => [...props.rows].slice(0, 12).reverse())

const formSummary = computed(() => {
  const t = { W: 0, D: 0, L: 0 }
  for (const r of formChips.value) {
    const k = resultOf(r)
    if (k in t) t[k as keyof typeof t]++
  }
  return `${t.W}W ${t.D}D ${t.L}L`
})

/** The two or three numbers worth putting in a hover, per sport. */
function tipStats(r: any): { k: string; v: string }[] {
  const out: { k: string; v: string }[] = []
  const push = (k: string, v: any, dp = 0, suffix = '') => {
    if (v == null) return
    out.push({ k, v: `${Number(v).toFixed(dp)}${suffix}` })
  }
  if (props.sport === 'basketball') {
    push('minutes', r.minutes, 0)
    push('points', r.points)
    push('reb / ast', null)
    if (r.rebounds != null && r.assists != null) {
      out.push({ k: 'reb / ast', v: `${Math.round(r.rebounds)} / ${Math.round(r.assists)}` })
    }
    push('plus-minus', r.plus_minus, 0)
  } else {
    push('minutes', r.minutes_played, 0)
    push('rating', r.rating, 1)
    if (r.goals != null || r.assists != null) {
      out.push({ k: 'goals / assists', v: `${r.goals ?? 0} / ${r.assists ?? 0}` })
    }
    push('xG', r.xg, 2)
  }
  return out
}

const anyNulls = computed(() =>
  props.rows.some((r) => columns.value.some((c) => valueOf(r, c) == null))
)

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'

/** Same convention as OpsBlindSpots / OpsLiveSlate — keys are readable as-is. */
const leagueLabel = (k: string) => (k || '—').replace(/_/g, ' ')
</script>

<style scoped>
.ml-count {
  font-size: 0.6rem;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.ml-form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.8rem;
  border-bottom: 1px solid var(--edge-soft);
  flex-wrap: wrap;
}
.ml-form-label {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-faint);
  font-weight: 600;
}
.ml-chips { display: flex; gap: 0.2rem; }
.ml-form-sum {
  margin-left: auto;
  font-size: 0.62rem;
  color: var(--ink-mute);
  font-variant-numeric: tabular-nums;
}

.ml-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.68rem;
}
.ml-th {
  padding: 0.4rem 0.45rem;
  text-align: right;
  font-size: 0.58rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-faint);
  white-space: nowrap;
  background: rgba(37, 40, 48, 0.3);
}
.ml-left { text-align: left; }
.ml-row { cursor: pointer; }
.ml-td {
  padding: 0.32rem 0.45rem;
  text-align: right;
  white-space: nowrap;
  color: var(--ink-soft);
}
.ml-num { font-variant-numeric: tabular-nums; }
.ml-null { color: var(--ink-faint); }
.ml-dim { color: var(--ink-mute); font-variant-numeric: tabular-nums; }
.ml-side { color: var(--ink-faint); margin-right: 0.3rem; }
.ml-opp { color: var(--ink); }
.ml-score {
  margin-left: 0.35rem;
  font-variant-numeric: tabular-nums;
  color: var(--ink-mute);
  font-size: 0.62rem;
}

.ml-empty,
.ml-note {
  padding: 0.6rem 0.8rem;
  font-size: 0.6rem;
  line-height: 1.55;
  color: var(--ink-faint);
}

.tip-title { font-weight: 700; color: var(--ink-strong); margin-bottom: 0.25rem; }
.tip-row { display: flex; justify-content: space-between; gap: 1rem; }
.tip-k { color: var(--ink-mute); }
.tip-v { font-weight: 700; font-variant-numeric: tabular-nums; }
.tip-foot {
  margin-top: 0.3rem;
  padding-top: 0.3rem;
  border-top: 1px solid var(--edge);
  color: var(--ink-faint);
  font-size: 0.6rem;
  text-transform: capitalize;
}
</style>
