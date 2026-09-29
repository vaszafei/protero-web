<template>
  <div>
    <div v-if="pending && !board" class="mb-3"><UiSkeletonPanel :rows="8" /></div>

    <div v-else-if="error" class="panel mb-3 mb-err">
      <p class="mb-err-t">The market board failed to load.</p>
      <p class="mb-err-b">{{ error }}</p>
    </div>

    <template v-else-if="board">
      <!-- Provenance, one line. Every number below is only as good as the
           price it came from, so the basis is stated first; the explanations
           sit behind each pill. -->
      <div class="mb-prov">
        <span class="mb-prov-item">
          <span class="mb-prov-k">Price</span>
          <UiTooltip :width="300" :text="basisPill.note">
            <span class="pill mb-help" :class="basisPill.cls">{{ basisPill.label }}</span>
          </UiTooltip>
        </span>
        <span class="mb-prov-item">
          <span class="mb-prov-k">De-vig</span>
          <UiTooltip :width="300" text="Margin removed before comparison (CD #40). Raw implied probabilities would overstate every difference by roughly half the vig.">
            <span class="pill pill-dim mb-help">{{ (devig || 'none').toUpperCase() }}</span>
          </UiTooltip>
        </span>
        <span class="mb-prov-item">
          <span class="mb-prov-k">Our number</span>
          <UiTooltip
            :width="300"
            :text="board.has_model
              ? `${enabledCount} of ${board.rows.length} markets are enabled for this competition in masks.py; the rest are shown but never bet.`
              : 'No prediction row for this fixture yet — the football pipeline places at 09:00. Our column fills in when it runs.'"
          >
            <span class="pill mb-help" :class="board.has_model ? 'pill-blue' : 'pill-dim'">{{ board.has_model ? board.model_version : 'none yet' }}</span>
          </UiTooltip>
        </span>
        <span class="mb-prov-foot">
          A gap between our number and the market is <strong>not an edge</strong> unless the cell passed holdout
          ({{ enabledCount }} enabled here).
        </span>
      </div>

      <!-- The board -->
      <div class="mb-grid">
        <section v-for="g in groups" :key="g.name" class="panel overflow-hidden">
          <header class="panel-head">
            <span class="panel-title">{{ g.name }}</span>
            <span class="panel-link">
              <span v-if="g.margin != null" class="mb-margin" :title="'The book\'s margin on this market: Σ(1/price) − 1'">margin {{ (g.margin * 100).toFixed(1) }}%</span>
              <span v-if="g.sum != null" :title="'De-vigged probabilities in a complete market must sum to 1.'">Σ {{ g.sum.toFixed(3) }}</span>
            </span>
          </header>
          <div class="mb-rows">
            <UiProbBar
              v-for="r in g.rows"
              :key="r.key"
              :label="r.label"
              :market="r.market"
              :ours="r.ours"
              :price="r.price"
              :fair-odds="r.fairOdds"
              :hide-empty-foot="!board.has_model"
              :enabled="r.enabled"
              :our-label="r.ourLabel"
              :disabled-note="r.disabledNote || 'not bet'"
              :devig-note="devigNote"
            />
          </div>
        </section>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * Market board — the pre-match cockpit.
 *
 * What was here: `OddsLadder`, a wall of decimal prices with no model number
 * anywhere near them, on a page whose two side rails said "No stats recorded".
 * A price on its own tells you what the market thinks; the only interesting
 * question is whether we disagree, by how much, and whether that disagreement
 * is one we have evidence for.
 */
import { computed } from 'vue'
import UiProbBar from '~/components/ui/ProbBar.vue'
import UiSkeletonPanel from '~/components/ui/SkeletonPanel.vue'
import UiTooltip from '~/components/ui/Tooltip.vue'

const props = defineProps<{ gameId: number | string }>()

// Same key as GamePrediction, so switching tabs does not refetch.
const { data: board, pending, error: fetchErr } = useSwr<any>(
  computed(() => `market:${props.gameId}`),
  () => $fetch(`/api/game/${props.gameId}/market`),
  { memoryTtl: 2 * 60_000 },
)
const error = computed(() => (fetchErr.value as any)?.data?.message || fetchErr.value?.message || null)

const devig = computed(() => board.value?.rows?.find((r: any) => r.devig)?.devig || null)

const devigNote = computed(() =>
  `Market probability is ${(devig.value || 'un').toString().toUpperCase()}-de-vigged (CD #40) from the ${
    basisPill.value.label.toLowerCase()
  }. A difference is not an edge unless the cell passed holdout.`
)

const BASIS: Record<string, { label: string; cls: string; note: string }> = {
  close_avg: {
    label: 'Closing price',
    cls: 'pill-good',
    note: 'The sharpest number available — the accuracy frontier, and not a price anyone could still have taken.',
  },
  open_avg: {
    label: 'Opening price',
    cls: 'pill-blue',
    note: 'A price that was actually available. Beating the open while losing to the close is what CLV means.',
  },
  book: {
    label: 'Our scraped price',
    cls: 'pill-amber',
    note: 'Stoiximan.gr via the FlashScore feed — the live price, and the only basis that exists before kick-off.',
  },
}
const basisPill = computed(() =>
  BASIS[board.value?.basis as string] || { label: 'No price', cls: 'pill-dim', note: 'No priced market recorded for this fixture.' }
)

const enabledCount = computed(() =>
  (board.value?.rows || []).filter((r: any) => r.enabled).length
)

/** The endpoint keys margins per line; a board group can span three lines. */
function groupMargin(name: string): number | null {
  const m = board.value?.margins || {}
  if (name === 'Total goals') {
    const vals = ['Over/Under 1.5', 'Over/Under 2.5', 'Over/Under 3.5'].map((k) => m[k]).filter((v) => v != null)
    return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null
  }
  return m[name] ?? null
}

const groups = computed(() => {
  const rows = board.value?.rows || []
  const order: string[] = []
  const byGroup = new Map<string, any[]>()
  for (const r of rows) {
    if (!byGroup.has(r.group)) { byGroup.set(r.group, []); order.push(r.group) }
    byGroup.get(r.group)!.push(r)
  }
  return order.map((name) => {
    const gr = byGroup.get(name)!
    // A complete market's de-vigged probabilities must sum to 1. Showing the
    // sum turns the de-vig into something the reader can check rather than
    // trust — 1X2 and both O/U pairs are complete; double chance is not
    // (the three overlap), so it gets no sum.
    const complete = name === '1X2' || name === 'Both teams to score'
    const probs = gr.map((r: any) => r.market).filter((p: any) => p != null)
    return {
      name,
      rows: gr,
      margin: groupMargin(name),
      sum: complete && probs.length === gr.length
        ? probs.reduce((a: number, b: number) => a + b, 0)
        : null,
    }
  })
})
</script>

<style scoped>
.mb-prov {
  display: flex; align-items: center; flex-wrap: wrap; gap: 0.4rem 1.1rem;
  margin-bottom: 0.65rem;
}
.mb-prov-item { display: inline-flex; align-items: center; gap: 0.4rem; }
.mb-prov-k {
  font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--ink-mute); font-weight: 700;
}
.mb-help { cursor: help; }
.mb-prov-foot { margin-left: auto; font-size: 0.72rem; color: var(--ink-faint); }
.mb-prov-foot strong { color: var(--ink-soft); font-weight: 600; }

.mb-grid {
  display: grid;
  gap: 0.65rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
}
/* Desktop: the four markets side by side — one screen, no scroll. */
@media (min-width: 1280px) {
  .mb-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

.mb-rows { padding: 0.15rem 0.75rem 0.45rem; }

.mb-margin { margin-right: 0.6rem; color: var(--ink-soft); font-variant-numeric: tabular-nums; }

.mb-err { padding: 0.8rem; border-color: var(--brand-red-edge); }
.mb-err-t { font-size: 0.75rem; font-weight: 700; color: var(--brand-red-hi); }
.mb-err-b { margin-top: 0.25rem; font-size: 0.7rem; color: var(--ink-faint); }
</style>
