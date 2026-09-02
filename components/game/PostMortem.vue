<template>
  <div>
    <div v-if="pending"><UiSkeletonPanel :rows="6" /></div>

    <div v-else-if="error" class="panel pm-err">
      <p class="pm-err-t">The post-mortem failed to load.</p>
      <p class="pm-err-b">{{ error }}</p>
    </div>

    <template v-else-if="pm && hasAnything">
      <section class="panel overflow-hidden">
        <header class="panel-head">
          <span class="panel-title">Post-mortem</span>
          <span v-if="pm.wagers.length" class="pill" :class="ledgerPill.cls">{{ ledgerPill.label }}</span>
          <span v-else class="pill pill-dim">not bet</span>
          <UiTooltip class="ml-auto" :width="360" placement="bottom">
            <span class="panel-link">why this is not a scoreboard</span>
            <template #content>
              <p class="pm-tip">{{ pm.caveat }}</p>
            </template>
          </UiTooltip>
        </header>

        <div class="pm-body">
          <!-- ── 1. THE WAGER ─────────────────────────────────────────────
               A fact about money, so it leads. Everything below it is a
               measurement, and measurements on one fixture are noise. -->
          <div v-if="pm.wagers.length" class="pm-block">
            <p class="pm-h">What we bet</p>
            <div v-for="w in pm.wagers" :key="w.id" class="pm-wager">
              <div class="pm-wager-head">
                <span class="pm-sel">{{ w.selection || w.market_label || w.bet_type }}</span>
                <span class="pill" :class="w.status === 'won' ? 'pill-good' : w.status === 'lost' ? 'pill-red' : 'pill-dim'">
                  {{ w.status }}
                </span>
                <span
                  v-if="w.profit != null"
                  class="pm-pl tabular-nums"
                  :class="w.profit > 0 ? 'pm-pl-up' : w.profit < 0 ? 'pm-pl-dn' : ''"
                >{{ w.profit > 0 ? '+' : '' }}{{ w.profit.toFixed(2) }}</span>
              </div>

              <dl class="pm-facts">
                <div><dt>Price taken</dt><dd class="tabular-nums">{{ w.odds?.toFixed(2) ?? '—' }}</dd></div>
                <div><dt>Stake</dt><dd class="tabular-nums">{{ w.stake?.toFixed(2) ?? '—' }}</dd></div>
                <div>
                  <dt>Our number</dt>
                  <dd class="tabular-nums">{{ w.ours != null ? pct(w.ours) : '—' }}</dd>
                </div>
                <div>
                  <dt>
                    <UiTooltip text="The probability the price implies before de-vigging — what you must beat just to break even at that price.">
                      <span class="pm-dt-hint">Break-even</span>
                    </UiTooltip>
                  </dt>
                  <dd class="tabular-nums">{{ w.odds ? pct(1 / w.odds) : '—' }}</dd>
                </div>
              </dl>

              <p v-if="!w.enabled && w.disabled_note" class="pm-note pm-note-warn">{{ w.disabled_note }}</p>
              <p v-else-if="w.enabled" class="pm-note">
                Cell enabled in <code>masks.py</code>, priced by
                {{ w.prob_source === 'gbm' ? 'the GBM' : 'Dixon-Coles' }}.
              </p>
            </div>
          </div>

          <div v-else class="pm-block">
            <p class="pm-h">What we bet</p>
            <p class="pm-empty">
              Nothing. The V6 picker placed no wager on this fixture — either no
              cell cleared EV ≥ 3% and edge ≥ 3% (CD #6), or this competition
              enables no market in <code>masks.py</code>.
            </p>
          </div>

          <!-- ── 2. LINE MOVEMENT ─────────────────────────────────────────
               The one price comparison this project trusts: p_close − p_open on
               the selection itself, both Shin-de-vigged, so the book's margin
               cancels and a random selector scores 0 in expectation. -->
          <div v-if="pm.clv.length" class="pm-block">
            <p class="pm-h">
              Did the market move our way?
              <UiTooltip :width="380">
                <span class="pm-dt-hint pm-h-hint">how this is measured</span>
                <template #content>
                  <p class="pm-tip">
                    The selection's own de-vigged probability at the close minus the same
                    number at the open. De-vigged probabilities sum to 1 across a market,
                    so this is margin-free and a random picker averages exactly zero — which
                    is why it is used instead of <em>price taken ÷ close</em>, a figure that
                    measures which book we quoted as much as when we bet.
                  </p>
                </template>
              </UiTooltip>
            </p>
            <div v-for="c in pm.clv" :key="c.market" class="pm-clv">
              <span class="pm-clv-lbl">{{ c.label }}</span>
              <div class="pm-clv-track">
                <i class="pm-clv-zero" />
                <i
                  class="pm-clv-fill"
                  :style="clvFill(c.dp)"
                />
              </div>
              <span class="pm-clv-val tabular-nums" :class="c.dp > 0 ? 'pm-clv-up' : c.dp < 0 ? 'pm-clv-dn' : ''">
                {{ c.dp > 0 ? '+' : '' }}{{ (c.dp * 100).toFixed(1) }}pp
              </span>
            </div>
            <p class="pm-note">
              {{ movedNote }}
            </p>
          </div>

          <!-- ── 3. OUR NUMBER VS THE MARKET'S ────────────────────────────
               A 0→1 axis with both probabilities and the outcome on it. The
               distance from a dot to the outcome IS its Brier score, so "who
               was closer" is the picture rather than a column of decimals. -->
          <div class="pm-block">
            <p class="pm-h">
              Our number against the market's
              <UiTooltip :width="360">
                <span class="pm-dt-hint pm-h-hint">reading the axis</span>
                <template #content>
                  <p class="pm-tip">
                    Each row is one market on a 0–100% axis. The bar marks where the outcome
                    landed. Whichever dot sits closer to it scored the lower Brier — that is
                    all Brier is: squared distance from the truth.
                  </p>
                </template>
              </UiTooltip>
            </p>

            <template v-if="pm.scores.length">
              <div class="pm-legend">
                <span class="pm-key"><i class="pm-dot pm-dot-ours" />ours</span>
                <span class="pm-key"><i class="pm-dot pm-dot-mkt" />market</span>
                <span class="pm-key"><i class="pm-tick" />outcome</span>
              </div>

              <div v-for="s in pm.scores" :key="s.market" class="pm-score" :class="{ 'pm-score-bet': s.wagered }">
                <div class="pm-score-lbl">
                  <span class="pm-score-name">{{ s.label }}</span>
                  <span v-if="s.wagered" class="pill pill-blue pm-tag">bet</span>
                  <span v-else-if="!s.enabled" class="pill pill-dim pm-tag">not bet</span>
                </div>

                <div class="pm-axis">
                  <i class="pm-axis-line" />
                  <i class="pm-outcome" :style="{ left: s.outcome === 1 ? '100%' : '0%' }" />
                  <UiTooltip :text="`market ${pct(s.market_prob)} — ${sourceLabel(s.market_source)}`">
                    <i class="pm-dot pm-dot-mkt pm-dot-abs" :style="{ left: pctPos(s.market_prob) }" />
                  </UiTooltip>
                  <UiTooltip :text="`ours ${pct(s.ours)} — ${s.our_source === 'gbm' ? 'GBM' : 'Dixon-Coles'}`">
                    <i class="pm-dot pm-dot-ours pm-dot-abs" :style="{ left: pctPos(s.ours) }" />
                  </UiTooltip>
                </div>

                <span
                  class="pm-verdict"
                  :class="s.beat_market ? 'pm-verdict-win' : 'pm-verdict-loss'"
                >{{ s.beat_market ? 'closer' : 'wider' }}</span>
              </div>

              <p class="pm-note">
                We were closer than the market on <strong>{{ beatCount }} of {{ pm.scores.length }}</strong>
                markets here — which is not a result. One fixture is a single draw from a
                distribution this project has already measured: across 34,010 fixtures our
                probability adds nothing to the price (b = +0.000, t = 0.00 against the
                opening line).
              </p>
            </template>

            <p v-else class="pm-empty">
              {{ pm.model_coverage.note }}
            </p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * The completed-fixture post-mortem.
 *
 * Written 2026-09-03 to render `/api/game/[id]/post-mortem`, which existed as a
 * half-finished client query in `useApi.ts` that nothing displayed. It is moved
 * server-side because `line_scores` is admin-RLS'd and because the probability
 * source is routed per (league, market) by `masks.py` — a client that assumed
 * Dixon-Coles would mislabel every GBM-priced cell.
 *
 * The ordering is deliberate: money first, then the margin-free line movement,
 * then the scoring comparison. The last of those is the least trustworthy on a
 * single fixture and is captioned as such everywhere it appears.
 */
import { ref, computed, watch } from 'vue'
import UiSkeletonPanel from '~/components/ui/SkeletonPanel.vue'
import UiTooltip from '~/components/ui/Tooltip.vue'

const props = defineProps<{ gameId: number | string }>()

const pm = ref<any>(null)
const pending = ref(true)
const error = ref<string | null>(null)

async function load() {
  pending.value = true
  error.value = null
  try {
    pm.value = await $fetch<any>(`/api/game/${props.gameId}/post-mortem`)
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Unknown error'
    pm.value = null
  } finally {
    pending.value = false
  }
}
watch(() => props.gameId, load, { immediate: true })

/** Render nothing at all rather than an empty shell with three empty states. */
const hasAnything = computed(() =>
  !!pm.value && (pm.value.wagers.length > 0 || pm.value.scores.length > 0 || pm.value.clv.length > 0)
)

const pct = (p: number | null) => (p == null ? '—' : `${(p * 100).toFixed(1)}%`)
/** Clamped so a dot at 0 or 1 still renders inside the track. */
const pctPos = (p: number | null) => `${Math.max(1.5, Math.min(98.5, (p ?? 0) * 100))}%`

const sourceLabel = (s: string) =>
  ({ close_avg: 'closing price', open_avg: 'opening price', book: 'our scraped price' }[s] || s)

const ledgerPill = computed(() => {
  const ws = pm.value?.wagers || []
  const net = ws.reduce((a: number, w: any) => a + (w.profit ?? 0), 0)
  if (!ws.length) return { cls: 'pill-dim', label: 'not bet' }
  if (ws.some((w: any) => w.status === 'pending')) return { cls: 'pill-amber', label: 'pending' }
  return net > 0
    ? { cls: 'pill-good', label: `+${net.toFixed(2)}` }
    : { cls: 'pill-red', label: net.toFixed(2) }
})

const beatCount = computed(() =>
  (pm.value?.scores || []).filter((s: any) => s.beat_market).length)

/**
 * The diverging bar. Zero sits at the centre; ±10pp saturates the track, which
 * is a wide move for a de-vigged probability between open and close.
 */
function clvFill(dp: number) {
  const span = Math.min(Math.abs(dp) / 0.10, 1) * 50
  return dp >= 0
    ? { left: '50%', width: `${span}%`, background: 'var(--brand-blue)' }
    : { left: `${50 - span}%`, width: `${span}%`, background: 'var(--brand-red)' }
}

const movedNote = computed(() => {
  const cs = pm.value?.clv || []
  if (!cs.length) return ''
  const toward = cs.filter((c: any) => c.dp > 0).length
  if (toward === cs.length) {
    return 'The market moved toward our selection after we took the price — the sign CLV looks for. On one fixture it is a coin flip; it only means anything pooled over hundreds.'
  }
  if (toward === 0) {
    return 'The market moved away from our selection — we took a price the market then judged worse. On one fixture that is noise, not a mistake.'
  }
  return 'Mixed movement across the wagered markets. One fixture cannot separate that from noise.'
})
</script>

<style scoped>
.pm-body { padding: 0.75rem 0.75rem 0.9rem; display: grid; gap: 1.1rem; }
@media (min-width: 640px) { .pm-body { padding: 1rem; } }

.pm-block { display: grid; gap: 0.5rem; }
.pm-h {
  font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--ink-mute); font-weight: 600;
  display: flex; align-items: baseline; gap: 0.5rem; flex-wrap: wrap;
}
.pm-h-hint { text-transform: none; letter-spacing: 0; font-weight: 400; }
.pm-dt-hint {
  border-bottom: 1px dotted var(--ink-faint); cursor: help; color: var(--ink-mute);
}
.pm-note { font-size: 0.7rem; color: var(--ink-mute); line-height: 1.5; }
.pm-note-warn { color: #f0c469; }
.pm-note code, .pm-empty code {
  background: var(--neutral-tint); padding: 0.05rem 0.25rem; border-radius: var(--r-sm);
  font-size: 0.66rem;
}
.pm-empty { font-size: 0.74rem; color: var(--ink-mute); line-height: 1.55; }
.pm-tip { font-size: 0.72rem; line-height: 1.55; }

/* ── The wager ─────────────────────────────────────────────────────────── */
.pm-wager {
  border: 1px solid var(--edge); border-radius: var(--r);
  background: var(--surface-lift); padding: 0.6rem 0.7rem; display: grid; gap: 0.55rem;
}
.pm-wager-head { display: flex; align-items: center; gap: 0.5rem; }
.pm-sel { font-size: 0.85rem; font-weight: 600; color: var(--ink-strong); }
.pm-pl { margin-left: auto; font-size: 0.85rem; font-weight: 700; }
.pm-pl-up { color: var(--positive); }
.pm-pl-dn { color: var(--brand-red); }

.pm-facts {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.45rem 0.9rem;
}
@media (min-width: 480px) { .pm-facts { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.pm-facts dt {
  font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-faint);
}
.pm-facts dd { font-size: 0.82rem; color: var(--ink); font-weight: 600; margin-top: 0.1rem; }

/* ── Line movement ─────────────────────────────────────────────────────── */
.pm-clv {
  display: grid; grid-template-columns: minmax(0, 7rem) minmax(0, 22rem) 4rem;
  align-items: center; gap: 0.6rem;
}
.pm-clv-lbl { font-size: 0.74rem; color: var(--ink-soft); }
.pm-clv-track {
  position: relative; height: 0.5rem; border-radius: var(--r-pill);
  background: var(--surface-hover); overflow: hidden;
}
.pm-clv-zero {
  position: absolute; left: 50%; top: 0; bottom: 0; width: 1px;
  background: var(--edge-lit);
}
.pm-clv-fill { position: absolute; top: 0; bottom: 0; border-radius: var(--r-pill); }
/* Line movement is not money, so it is NOT green — green is reserved for
   money-positive (the brand rule). Blue reads favourable, red adverse, and
   both match the bar beside them. */
.pm-clv-val { font-size: 0.74rem; font-weight: 700; text-align: right; }
.pm-clv-up { color: var(--brand-blue-hi); }
.pm-clv-dn { color: var(--brand-red-hi); }

/* ── Ours vs the market ────────────────────────────────────────────────── */
.pm-legend { display: flex; gap: 0.9rem; font-size: 0.62rem; color: var(--ink-mute); }
.pm-key { display: inline-flex; align-items: center; gap: 0.3rem; }

.pm-score {
  display: grid; grid-template-columns: minmax(0, 10.5rem) 1fr 3.2rem;
  align-items: center; gap: 0.6rem; padding: 0.25rem 0;
}
.pm-score-bet .pm-score-name { color: var(--ink-strong); font-weight: 600; }
.pm-score-lbl { display: flex; align-items: center; gap: 0.35rem; min-width: 0; }
.pm-score-name {
  font-size: 0.74rem; color: var(--ink-soft);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.pm-tag { flex: none; }

.pm-axis { position: relative; height: 1.1rem; }
.pm-axis-line {
  position: absolute; left: 0; right: 0; top: 50%; height: 2px; margin-top: -1px;
  border-radius: var(--r-pill); background: var(--surface-hover);
}
/* The outcome: a full-height tick at 0 or 1. The truth the dots are scored against. */
.pm-outcome {
  position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px;
  background: var(--ink-strong); border-radius: var(--r-pill);
}
.pm-dot {
  width: 0.5rem; height: 0.5rem; border-radius: 50%; display: inline-block; flex: none;
}
.pm-dot-abs {
  position: absolute; top: 50%; margin-top: -0.25rem; margin-left: -0.25rem;
  box-shadow: 0 0 0 2px var(--surface);
}
.pm-dot-ours { background: var(--brand-blue); }
.pm-dot-mkt { background: var(--ink-mute); }
.pm-tick {
  width: 2px; height: 0.75rem; background: var(--ink-strong);
  display: inline-block; border-radius: var(--r-pill);
}

.pm-verdict { font-size: 0.66rem; font-weight: 600; text-align: right; }
.pm-verdict-win { color: var(--brand-blue-hi); }
.pm-verdict-loss { color: var(--ink-faint); }

.pm-err { padding: 0.9rem; }
.pm-err-t { font-size: 0.8rem; color: var(--ink); }
.pm-err-b { font-size: 0.7rem; color: var(--ink-mute); margin-top: 0.25rem; }
</style>
