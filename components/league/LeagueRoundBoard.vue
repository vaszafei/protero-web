<template>
  <section class="panel panel-fill h-full">
    <header class="panel-head !items-center gap-3 flex-shrink-0">
      <h3 class="panel-title">{{ byDate ? 'Day' : 'Round' }} board</h3>
      <span class="rb-step">
        <button type="button" class="rb-step-btn" :disabled="!canPrev" title="Previous" @click="step(-1)">‹</button>
        <span class="rb-step-label tabular-nums">{{ heading }}</span>
        <button type="button" class="rb-step-btn" :disabled="!canNext" title="Next" @click="step(1)">›</button>
      </span>
      <span class="panel-count">{{ rows.length }} {{ rows.length === 1 ? 'fixture' : 'fixtures' }}</span>
      <span v-if="board" class="pill pill-dim" :title="enabledTitle">{{ board.enabled_cells }} enabled</span>
      <span class="pill" :class="bases.length > 1 ? 'pill-amber' : 'pill-dim'" title="The price basis behind the market ticks. Mixed means rows are not all on the same basis.">{{ basisLabel(bases) }}</span>

      <UiTooltip class="ml-auto" :width="420" placement="bottom">
        <span class="panel-link">how to read</span>
        <template #content>
          <p>
            Each bar is one market on one axis: the tick is the book's probability (Shin-de-vigged, CD #40) and the
            dot is ours, with the gap drawn between them. A gap on a cell the mask does not enable is shown and
            greyed — it is a difference, not an edge (CD #3). The numbers are the same ones the fixture's Market tab
            shows, from the same code.
          </p>
          <p class="mt-2">
            Status: <b>Bet</b> a single of ours · <b>In slips</b> only as a parlay leg · <b>Not bet</b> the cell is not
            enabled · <b>Scored</b> the model priced it, nothing struck · <b>No price</b> / <b>Not yet</b> nothing to
            price against / pipeline has not run. Wagers: ours · mirrored tipsters'.
          </p>
          <p class="mt-2">Model output, not advice. No wallet in this project reaches p&lt;0.05.</p>
        </template>
      </UiTooltip>
    </header>

    <UiErrorState v-if="error" class="m-3" title="The round board failed to load." :error="error" @retry="load" />

    <div v-else-if="pending && !board" class="p-3"><UiSkeletonPanel :rows="8" /></div>

    <p v-else-if="!rows.length" class="px-4 py-8 text-center text-xs text-zinc-500">
      No fixture in this {{ byDate ? 'day' : 'round' }}.
    </p>

    <div v-else class="panel-scroll">
      <div class="rb-row rb-head" :class="{ 'rb-bb': isBball }">
        <span>Kick-off</span>
        <span>Fixture</span>
        <span>Status</span>
        <span>{{ isBball ? 'Home' : 'Home win' }}</span>
        <span v-if="!isBball">Draw</span>
        <span>{{ isBball ? 'Away' : 'Away win' }}</span>
        <span v-if="!isBball">Over 2.5</span>
        <span class="text-right" title="Wagers in the ledger on this fixture: ours · mirrored tipsters'">Wagers</span>
      </div>

      <NuxtLink
        v-for="(r, i) in rows" :key="r.game_id"
        :to="`/game/${r.game_id}`"
        class="rb-row rb-data row-in"
        :class="{ 'rb-bb': isBball }"
        :style="rowDelay(i)"
      >
        <span class="text-[11px] text-zinc-500 tabular-nums whitespace-nowrap">{{ kickoff(r.date) }}</span>

        <span class="rb-fixture">
          <span class="rb-team">
            <img v-if="r.home_key" :src="getTeamLogoUrl(r.home_key)" class="rb-logo" loading="lazy" alt="" @error="hideImg" />
            <span class="truncate">{{ r.home }}</span>
            <b v-if="r.status === 'completed'" class="rb-score tabular-nums">{{ r.home_goals }}</b>
          </span>
          <span class="rb-team">
            <img v-if="r.away_key" :src="getTeamLogoUrl(r.away_key)" class="rb-logo" loading="lazy" alt="" @error="hideImg" />
            <span class="truncate">{{ r.away }}</span>
            <b v-if="r.status === 'completed'" class="rb-score tabular-nums">{{ r.away_goals }}</b>
          </span>
        </span>

        <span>
          <UiTooltip :width="300" placement="bottom">
            <span class="pill" :class="statusPill(r.fixture_status.tag)">{{ r.fixture_status.tag }}</span>
            <template #content><p>{{ r.fixture_status.text }}</p></template>
          </UiTooltip>
        </span>

        <UiProbBar v-for="cell in cells(r)" :key="cell.key" v-bind="cell.props" />

        <span class="text-right text-[11px] tabular-nums text-zinc-400">
          <template v-if="r.wagers.ours || r.wagers.mirrors">
            <span :class="r.wagers.ours ? 'text-zinc-200' : ''">{{ r.wagers.ours }}</span>
            <span class="text-zinc-700"> · </span>{{ r.wagers.mirrors }}
          </template>
          <span v-else class="text-zinc-700">—</span>
        </span>
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * A league's Predictions tab, rebuilt on the market-board approach: one row per fixture of a
 * round, every number from `GET /api/league/[key]/round-board`, which builds it with the same
 * functions as the fixture's own Market tab.
 *
 * It replaces a card per fixture that issued a head-to-head request matched by team NAME (50
 * requests to open a Premier League round) and displayed "Expected goals" — a sum of two
 * averages, not a model. Nothing here is computed in the client.
 */
import { computed, ref, watch } from 'vue'
import UiTooltip from '~/components/ui/Tooltip.vue'
import UiProbBar from '~/components/ui/ProbBar.vue'
import UiErrorState from '~/components/ui/ErrorState.vue'
import UiSkeletonPanel from '~/components/ui/SkeletonPanel.vue'
import { getTeamLogoUrl } from '~/utils/teamLogo'
import { basisLabel } from '~/utils/market-basis'
import { errorText } from '~/utils/error-text'
import { rowDelay } from '~/utils/motion'

const props = defineProps<{
  leagueKey: string
  season: string
  sport: string
  /** Football: the round to open on. */
  initialRound?: number
  /** Paged by day (basketball, cup football): YYYY-MM-DD to open on. */
  initialDate?: string | null
  byDate: boolean
  maxRound?: number
}>()

const apiFetch = useApiFetch()
const isBball = computed(() => props.sport === 'basketball')

const round = ref<number>(props.initialRound || 1)
const date = ref<string>(props.initialDate || new Date().toISOString().slice(0, 10))

const board = ref<any>(null)
const pending = ref(true)
const error = ref<string | null>(null)
const rows = computed<any[]>(() => board.value?.rows || [])

const bases = computed(() => {
  const set = new Set<string>()
  for (const r of rows.value) for (const b of r.bases || []) set.add(b)
  return [...set]
})

let seq = 0
async function load() {
  const mine = ++seq
  pending.value = true
  error.value = null
  try {
    const q = props.byDate ? { date: date.value } : { round: round.value }
    const res = await apiFetch<any>(`/api/league/${props.leagueKey}/round-board`, { query: { season: props.season, ...q } })
    if (mine === seq) board.value = res
  } catch (e) {
    if (mine === seq) error.value = errorText(e)
  } finally {
    if (mine === seq) pending.value = false
  }
}
watch([() => props.leagueKey, () => props.season, round, date], load, { immediate: true })

const heading = computed(() => (props.byDate
  ? new Date(`${date.value}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  : `Round ${round.value}`))
const canPrev = computed(() => props.byDate || round.value > 1)
const canNext = computed(() => props.byDate || !props.maxRound || round.value < props.maxRound)
function step(d: number) {
  if (props.byDate) {
    date.value = new Date(Date.parse(`${date.value}T12:00:00Z`) + d * 86400_000).toISOString().slice(0, 10)
  } else {
    round.value += d
  }
}

const enabledTitle = computed(() =>
  'Markets the picker may bet in this competition (the mask, CD #3). 0 means a gap on this board is a difference, never an edge.')

/** One ProbBar per market cell this row carries; absent markets are skipped, not zero-filled. */
function cells(r: any) {
  const defs = isBball.value
    ? [['home', r.result.home], ['away', r.result.away]]
    : [['home', r.result.home], ['draw', r.result.draw], ['away', r.result.away], ['over', r.over_25.over]]
  return defs.map(([key, c]: any) => ({
    key,
    props: {
      label: c?.label ?? String(key),
      market: c?.market ?? null,
      ours: c?.ours ?? null,
      price: c?.price ?? null,
      fairOdds: c?.fairOdds ?? null,
      enabled: !!c?.enabled,
      ourLabel: c?.ourLabel ?? 'model',
      disabledNote: c?.disabledNote || 'not bet',
      hideEmptyFoot: true,
    },
  }))
}

const STATUS_PILL: Record<string, string> = {
  Bet: 'pill-good', 'In slips': 'pill-blue', 'Not bet': 'pill-dim', Scored: 'pill-blue',
  'No price': 'pill-dim', 'Not yet': 'pill-dim', 'Not scored': 'pill-dim',
}
const statusPill = (tag: string) => STATUS_PILL[tag] || 'pill-dim'

function kickoff(d: string) {
  const dt = new Date(d)
  return `${dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} ${dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}
function hideImg(e: Event) { (e.target as HTMLElement).style.display = 'none' }
</script>

<style scoped>
.rb-row {
  display: grid;
  grid-template-columns: 5.6rem minmax(11rem, 1.1fr) 5.2rem repeat(4, minmax(0, 1fr)) 4.6rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.35rem 0.8rem;
}
.rb-row.rb-bb { grid-template-columns: 5.6rem minmax(11rem, 1.1fr) 5.2rem repeat(2, minmax(0, 1fr)) 4.6rem; }
.rb-head {
  position: sticky; top: 0; z-index: 1; background: var(--surface);
  font-size: 0.62rem; letter-spacing: 0.03em; text-transform: uppercase; color: var(--ink-mute);
  border-bottom: 1px solid var(--edge); padding-block: 0.3rem;
}
.rb-data { border-bottom: 1px solid var(--edge-soft); transition: background var(--dur-fast) ease; }
.rb-data:hover { background: var(--brand-blue-tint); }
.rb-fixture { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.rb-team { display: flex; align-items: center; gap: 0.4rem; font-size: 0.72rem; color: var(--ink); min-width: 0; }
.rb-logo { width: 0.95rem; height: 0.95rem; object-fit: contain; flex-shrink: 0; }
.rb-score { margin-left: auto; color: var(--ink-strong); }
.rb-step { display: inline-flex; align-items: center; gap: 0.35rem; }
.rb-step-btn {
  width: 1.25rem; height: 1.25rem; border-radius: 0.35rem; line-height: 1;
  background: var(--neutral-tint); border: 1px solid var(--edge); color: var(--ink-soft);
  cursor: pointer; transition: background var(--dur-fast) ease;
}
.rb-step-btn:hover:not(:disabled) { background: var(--brand-blue-tint); color: var(--ink-strong); }
.rb-step-btn:disabled { opacity: 0.25; cursor: not-allowed; }
.rb-step-label { font-size: 0.75rem; font-weight: 600; color: var(--ink); min-width: 4.5rem; text-align: center; }

@media (prefers-reduced-motion: reduce) {
  .rb-data, .rb-step-btn { transition: none; }
}
</style>
