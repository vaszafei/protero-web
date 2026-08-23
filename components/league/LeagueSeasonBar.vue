<template>
  <div class="seasonbar rounded-lg px-3 py-2 sm:px-4 sm:py-2.5">
    <!-- Row 1 — season + round selection. The progress rail and the season's
         numbers sit below it, so the controls stay the one obvious place to
         change the view. -->
    <div class="flex items-center gap-2.5 flex-wrap">
      <!-- Season -->
      <div class="relative">
        <select
          :value="season"
          @change="$emit('update:season', $event.target.value)"
          class="season-select"
          title="Season"
        >
          <option v-if="!seasons.length" :value="season">{{ seasonLabel(season) }}</option>
          <option v-for="s in seasons" :key="s.season" :value="s.season">
            {{ s.label || seasonLabel(s.season) }}
          </option>
        </select>
      </div>

      <span v-if="!isCurrentSeason" class="chip chip-archive">ARCHIVE</span>

      <!-- Round stepper -->
      <div class="stepper">
        <button
          type="button"
          @click="$emit('update:round', round - 1)"
          :disabled="round <= 1"
          class="stepper-btn"
          title="Previous round"
        >‹</button>
        <span class="stepper-label">{{ roundLabel }}<span class="text-zinc-600"> / {{ maxRound }}</span></span>
        <button
          type="button"
          @click="$emit('update:round', round + 1)"
          :disabled="round >= maxRound"
          class="stepper-btn"
          title="Next round"
        >›</button>
      </div>

      <button
        v-if="liveRound && liveRound !== round"
        type="button"
        @click="$emit('update:round', liveRound)"
        class="chip chip-live"
        :title="`Jump to ${unitName} ${liveRound}`"
      >Go to now</button>
    </div>

    <!-- Row 2 — the compact season progress (40% of the bar) and the season's
         numbers, one line. The rail is the navigation; the stats beside it are
         what the rail is a picture of. -->
    <div class="mt-2 flex items-center gap-3 sm:gap-4">
      <div class="progress-col">
        <!-- One segment per round; its fill is the share of that round already
             played. It is the progress bar and the round navigation at once. -->
        <div v-if="segments.length" class="rail" :style="{ '--cols': segments.length }">
          <button
            v-for="seg in segments"
            :key="seg.round"
            type="button"
            class="rail-seg"
            :class="seg.round === round ? 'rail-seg-on' : ''"
            :title="`${unitName} ${seg.round} — ${seg.completed}/${seg.total} played`"
            @click="$emit('update:round', seg.round)"
          >
            <span class="rail-fill" :style="{ width: seg.pct + '%', background: seg.color }" />
          </button>
        </div>
        <!-- Too many match days to draw as slivers: one plain meter. -->
        <div v-else class="meter">
          <span class="meter-fill" :style="{ width: pctPlayed + '%' }" />
        </div>
        <div v-if="segments.length" class="rail-meta">
          <span class="tabular-nums">{{ unitName }} 1</span>
          <span class="tabular-nums">{{ unitName }} {{ maxRound }}</span>
        </div>
      </div>

      <!-- Season stats — faded in as a block when the season changes. -->
      <Transition name="statswap" mode="out-in">
        <div :key="season" class="stats">
          <span class="phase-dot" :class="phase.dotClass" />
          <span class="stat-phase">{{ phase.label }}</span>
          <span class="stat-sep">·</span>
          <span class="stat-line">
            <span class="stat-num">{{ completed }}</span>
            <span class="stat-mut">/{{ total }} played</span>
          </span>
          <span class="stat-sep hidden sm:inline">·</span>
          <span class="stat-line hidden sm:inline">
            <span class="stat-num">{{ pctPlayed }}%</span>
            <span class="stat-mut">of season</span>
          </span>
          <span
            v-if="unrounded"
            class="stat-amber"
            :title="`${unrounded} fixtures carry no round number and appear in no round below`"
          >· {{ unrounded }} unmapped</span>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
/**
 * Season + round control, and the season's own progress.
 *
 * The old header carried a season dropdown, two arrows and a strip of identical
 * dots. The dots said which round you were on and nothing else — not how far the
 * season had actually got, not which rounds hold played games. The rail below
 * encodes both: one segment per round, filled by the share of that round's
 * fixtures that have a result.
 */
import { computed } from 'vue'
import { seqStep } from '~/utils/viz'

const props = defineProps({
  season: { type: String, required: true },
  seasons: { type: Array, default: () => [] },
  isCurrentSeason: { type: Boolean, default: true },
  round: { type: Number, required: true },
  maxRound: { type: Number, required: true },
  roundLabel: { type: String, default: '' },
  /** The round the calendar is actually on — the "Go to now" target. */
  liveRound: { type: Number, default: null },
  /** [{ round, total, completed }] for every round in the season. */
  rounds: { type: Array, default: () => [] },
  /** Fixtures in this season carrying no round number — they appear in no round. */
  unrounded: { type: Number, default: 0 },
  /**
   * Season totals over EVERY fixture. Derived from `rounds` alone they missed
   * whatever carries no round number: Champions League 2026/27 read "0 of 90
   * played" while 83 of those fixtures had a result.
   */
  total: { type: Number, default: 0 },
  completed: { type: Number, default: 0 },
  /** Paged by match day rather than by round — basketball, and cup football. */
  byDate: { type: Boolean, default: false },
})

defineEmits(['update:season', 'update:round'])

const unitName = computed(() => (props.byDate ? 'Day' : 'Round'))

const total = computed(() => props.total || props.rounds.reduce((s, r) => s + r.total, 0) + props.unrounded)
const completed = computed(() => props.completed)
const pctPlayed = computed(() => (total.value ? Math.round((completed.value / total.value) * 100) : 0))

/**
 * Segments are only legible while each one is wide enough to read. Past ~46 the
 * rail becomes a texture, so basketball's date pages fall back to a plain meter.
 */
const segments = computed(() => {
  if (props.byDate || props.rounds.length > 46) return []
  return props.rounds.map((r) => {
    const pct = r.total ? Math.round((r.completed / r.total) * 100) : 0
    return { ...r, pct, color: seqStep(pct / 100) }
  })
})

/**
 * Phase reads the raw counts, not the rounded percentage — 1 of 301 played
 * rounds to 0% and would otherwise be labelled "Not started" while a result
 * sits on the page.
 */
const phase = computed(() => {
  if (!total.value) return { label: 'No fixtures', dotClass: 'bg-zinc-600' }
  if (completed.value === 0) return { label: 'Not started', dotClass: 'bg-zinc-600' }
  if (completed.value === total.value) return { label: 'Complete', dotClass: 'bg-zinc-500' }
  const p = pctPlayed.value
  if (p < 15) return { label: 'Opening rounds', dotClass: 'bg-sky-400' }
  if (p < 85) return { label: 'In progress', dotClass: 'bg-emerald-400' }
  return { label: 'Run-in', dotClass: 'bg-amber-400' }
})

/** '2026-2027' → '2026/27' */
function seasonLabel(season) {
  const s = String(season || '')
  const m = s.match(/^(\d{4})-(\d{4})$/)
  return m ? `${m[1]}/${m[2].slice(2)}` : s
}
</script>

<style scoped>
.seasonbar {
  background: linear-gradient(180deg, rgba(37, 40, 48, 0.45), rgba(28, 31, 39, 0.9));
  border: 1px solid #2a2f3a;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 8px 24px -16px rgba(0, 0, 0, 0.9);
}

.season-select {
  appearance: none;
  padding: 0.35rem 1.6rem 0.35rem 0.65rem;
  border-radius: 0.5rem;
  background:
    linear-gradient(45deg, transparent 50%, rgb(113, 113, 122) 50%) calc(100% - 13px) calc(50% + 1px) / 5px 5px no-repeat,
    rgba(255, 255, 255, 0.04);
  border: 1px solid #2a2f3a;
  color: rgb(228, 231, 236);
  font-size: 0.72rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.season-select:focus { outline: none; border-color: rgba(57, 135, 229, 0.6); }

.chip {
  padding: 0.16rem 0.45rem;
  border-radius: 999px;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}
.chip-archive { background: rgba(250, 178, 25, 0.12); color: #fac95e; }
.chip-live {
  background: rgba(57, 135, 229, 0.16);
  color: #8fbdf5;
  border: 1px solid rgba(57, 135, 229, 0.3);
  letter-spacing: 0.02em;
  transition: background 160ms ease;
}
.chip-live:hover { background: rgba(57, 135, 229, 0.28); }

.stepper {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.1rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid #2a2f3a;
}
.stepper-btn {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 0.4rem;
  color: rgb(161, 161, 170);
  font-size: 1rem;
  line-height: 1;
  transition: background 140ms ease, color 140ms ease;
}
.stepper-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.07); color: #fff; }
.stepper-btn:disabled { opacity: 0.25; cursor: not-allowed; }
.stepper-label {
  padding: 0 0.4rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: rgb(212, 212, 216);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Row 2 — the progress rail takes 40% of the bar; the stats fill the rest. */
.progress-col {
  width: 40%;
  min-width: 150px;
  flex-shrink: 0;
}
@media (max-width: 639px) {
  .progress-col { width: 44%; min-width: 120px; }
}

.phase-dot { width: 0.4rem; height: 0.4rem; border-radius: 999px; display: inline-block; flex-shrink: 0; }

.rail {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  gap: 2px; /* the surface gap — what separates touching marks */
}
.rail-seg {
  position: relative;
  height: 0.45rem;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
  transition: height 180ms ease, background 140ms ease, transform 140ms ease;
}
.rail-seg:hover { background: rgba(255, 255, 255, 0.1); transform: translateY(-1px); }
.rail-seg-on {
  height: 0.6rem;
  margin-top: -0.075rem;
  box-shadow: 0 0 0 1px rgba(57, 135, 229, 0.75), 0 0 16px -2px rgba(57, 135, 229, 0.65);
}
.rail-fill {
  position: absolute;
  inset: 0 auto 0 0;
  display: block;
  border-radius: 2px 0 0 2px;
  transition: width 400ms cubic-bezier(0.22, 1, 0.36, 1);
}
.rail-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 0.3rem;
  font-size: 0.58rem;
  color: rgb(101, 103, 112);
  font-variant-numeric: tabular-nums;
}

.meter {
  height: 0.45rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}
.meter-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #184f95, #3987e5);
  transition: width 400ms cubic-bezier(0.22, 1, 0.36, 1);
}

/* Season stats — the numbers the rail is a picture of. */
.stats {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  flex-wrap: wrap;
  font-size: 0.64rem;
  font-variant-numeric: tabular-nums;
  color: rgb(113, 113, 122);
}
.stat-phase { font-weight: 600; color: rgb(212, 212, 216); white-space: nowrap; }
.stat-sep { color: rgb(63, 65, 74); }
.stat-line { display: inline-flex; align-items: baseline; gap: 0.25rem; white-space: nowrap; }
.stat-num { font-weight: 700; color: rgb(228, 231, 236); }
.stat-mut { color: rgb(113, 113, 122); }
.stat-amber { color: rgba(252, 211, 77, 0.85); white-space: nowrap; }

/* A season change fades the stats block in rather than snapping. */
.statswap-enter-active, .statswap-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}
.statswap-enter-from, .statswap-leave-to { opacity: 0; transform: translateY(3px); }

@media (prefers-reduced-motion: reduce) {
  .rail-fill, .meter-fill, .rail-seg, .statswap-enter-active, .statswap-leave-active { transition: none; }
}
</style>
