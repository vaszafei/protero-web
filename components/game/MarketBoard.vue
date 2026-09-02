<template>
  <div>
    <div v-if="pending" class="mb-3"><UiSkeletonPanel :rows="8" /></div>

    <div v-else-if="error" class="panel mb-3 mb-err">
      <p class="mb-err-t">The market board failed to load.</p>
      <p class="mb-err-b">{{ error }}</p>
    </div>

    <template v-else-if="board">
      <!-- Provenance strip. Every number below is only as good as the price it
           came from, so the basis is stated before the numbers, not after. -->
      <div class="mb-prov panel">
        <div class="mb-prov-row">
          <span class="mb-prov-k">Price basis</span>
          <span class="mb-prov-v">
            <span class="pill" :class="basisPill.cls">{{ basisPill.label }}</span>
            <span class="mb-prov-note">{{ basisPill.note }}</span>
          </span>
        </div>
        <div class="mb-prov-row">
          <span class="mb-prov-k">De-vig</span>
          <span class="mb-prov-v">
            <span class="pill pill-dim">{{ (devig || 'none').toUpperCase() }}</span>
            <span class="mb-prov-note">
              Margin removed before comparison — CD #40. Raw implied probabilities
              would overstate every difference by roughly half the vig.
            </span>
          </span>
        </div>
        <div class="mb-prov-row">
          <span class="mb-prov-k">Our number</span>
          <span class="mb-prov-v">
            <template v-if="board.has_model">
              <span class="pill pill-blue">{{ board.model_version }}</span>
              <span class="mb-prov-note">
                {{ enabledCount }} of {{ board.rows.length }} markets are enabled for this
                competition in <code>masks.py</code>; the rest are shown but never bet.
              </span>
            </template>
            <template v-else>
              <span class="pill pill-dim">none yet</span>
              <span class="mb-prov-note">
                No prediction row for this fixture — the football pipeline places at 09:00.
                The market side below is complete; our column fills in when it runs.
              </span>
            </template>
          </span>
        </div>
      </div>

      <!-- The board -->
      <div class="mb-grid">
        <section v-for="g in groups" :key="g.name" class="panel overflow-hidden">
          <header class="panel-head">
            <span class="panel-title">{{ g.name }}</span>
            <span v-if="g.sum != null" class="panel-link" :title="'De-vigged probabilities in a complete market must sum to 1.'">
              Σ {{ g.sum.toFixed(3) }}
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
              :enabled="r.enabled"
              :our-label="r.ourLabel"
              :disabled-note="r.disabledNote || 'not bet'"
              :devig-note="devigNote"
            />
          </div>
        </section>
      </div>

      <p class="mb-foot">
        A difference between our number and the market's is <strong>not an edge</strong>
        unless the cell passed holdout — this project measured its own probability
        sources as redundant to the price rather than ahead of it (given the opening
        price as a free offset, Dixon-Coles earns a stack weight of b = +0.000, t = 0.00).
        Cells that are bet are the {{ enabledCount }} marked above; everything else is
        rendered for context.
      </p>
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
import { computed, watch, ref } from 'vue'
import UiProbBar from '~/components/ui/ProbBar.vue'
import UiSkeletonPanel from '~/components/ui/SkeletonPanel.vue'

const props = defineProps<{ gameId: number | string }>()

const board = ref<any>(null)
const pending = ref(true)
const error = ref<string | null>(null)

async function load() {
  pending.value = true
  error.value = null
  try {
    board.value = await $fetch<any>(`/api/game/${props.gameId}/market`)
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Unknown error'
    board.value = null
  } finally {
    pending.value = false
  }
}
watch(() => props.gameId, load, { immediate: true })

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
      sum: complete && probs.length === gr.length
        ? probs.reduce((a: number, b: number) => a + b, 0)
        : null,
    }
  })
})
</script>

<style scoped>
.mb-prov {
  padding: 0.55rem 0.7rem;
  margin-bottom: 0.75rem;
}
.mb-prov-row {
  display: grid;
  grid-template-columns: 5.5rem 1fr;
  gap: 0.5rem;
  align-items: baseline;
  padding: 0.18rem 0;
}
.mb-prov-k {
  font-size: 0.57rem; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--ink-faint); font-weight: 700;
}
.mb-prov-v { display: flex; align-items: baseline; gap: 0.4rem; flex-wrap: wrap; }
.mb-prov-note {
  font-size: 0.6rem; line-height: 1.5; color: var(--ink-faint); flex: 1; min-width: 14rem;
}
.mb-prov-note code {
  padding: 0 0.2rem; border-radius: 3px;
  background: var(--neutral-tint); color: var(--ink-mute);
}

.mb-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;
}
@media (min-width: 900px) {
  .mb-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.mb-rows { padding: 0.3rem 0.8rem 0.6rem; }

.mb-foot {
  margin-top: 0.85rem;
  font-size: 0.6rem; line-height: 1.65; color: var(--ink-faint);
  max-width: 80ch;
}
.mb-foot strong { color: var(--ink-mute); font-weight: 600; }

.mb-err { padding: 0.8rem; border-color: var(--brand-red-edge); }
.mb-err-t { font-size: 0.75rem; font-weight: 700; color: var(--brand-red-hi); }
.mb-err-b { margin-top: 0.25rem; font-size: 0.62rem; color: var(--ink-faint); }
</style>
