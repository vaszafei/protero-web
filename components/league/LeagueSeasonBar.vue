<template>
  <!-- Merged into the page's identity card (2026-08-25) — this renders as the
       body of that card, not its own bordered box. Ring + status on the left,
       the round rail filling the remaining width on the right so the whole
       header uses the page's real width instead of a 340px sidebar column. -->
  <div class="seasonbody mt-3.5 flex flex-col md:flex-row md:items-center gap-4">
    <div class="flex items-center gap-3.5 flex-shrink-0">
      <!-- Radial progress ring. Two stacked circles (track + arc) via conic-gradient,
           masked to a ring so it stays crisp regardless of DPI. -->
      <div class="ring" :style="ringStyle">
        <div class="ring-hole">
          <span class="ring-pct">{{ pctPlayed }}<span class="ring-pct-sym">%</span></span>
        </div>
      </div>

      <div class="min-w-0">
        <span class="phase">
          <span class="phase-dot-wrap">
            <span class="phase-dot-ping" :class="phase.dotClass" />
            <span class="phase-dot" :class="phase.dotClass" />
          </span>
          <span class="phase-label">{{ phase.label }}</span>
          <span v-if="!isCurrentSeason" class="chip chip-archive">ARCHIVE</span>
        </span>

        <p class="played-line">
          <span class="stat-num">{{ completed }}</span>
          <span class="stat-mut">/ {{ total }} played</span>
        </p>
      </div>
    </div>

    <!-- Progress rail: one segment per round, filled by that round's completion.
         Still the navigation — clicking a segment jumps to that round. -->
    <div class="min-w-0 flex-1">
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
      <div v-else class="meter">
        <span class="meter-fill" :style="{ width: pctPlayed + '%' }" />
      </div>
    </div>

    <div v-if="(liveRound && liveRound !== round) || unrounded" class="foot-row flex-shrink-0">
      <button
        v-if="liveRound && liveRound !== round"
        type="button"
        @click="$emit('update:round', liveRound)"
        class="chip chip-live"
        :title="`Jump to ${unitName} ${liveRound}`"
      >
        <span class="chip-live-dot" />
        Go to now
      </button>

      <p
        v-if="unrounded"
        class="stat-amber"
        :title="`FlashScore's schedule feed only publishes round numbers for the ~12 rounds nearest today. These ${unrounded} later fixtures exist and are correctly dated — they just don't have a round number assigned yet. That fills in automatically as the season gets closer to them.`"
      >{{ unrounded }} not yet scheduled by round</p>
    </div>
  </div>
</template>

<script setup>
/**
 * The season status strip — a progress ring plus the per-round rail.
 *
 * Redrawn 2026-08-25, twice. First pass gave it a ring instead of four stacked
 * text lines. Second pass merged it into the page's identity card (it used to
 * float beside it as its own 340px-wide box) — this component now renders as
 * that card's body, full page width, ring + status on the left and the rail
 * filling the rest of the row. The "Round 1 / Round N" range under the rail
 * was cut too: the ring already states the percentage and every segment is
 * independently labelled on hover, so the range added nothing.
 *
 * The season dropdown lives in the identity card's header row, and the round
 * stepper lives on the round cards (LeagueOverview) — this strip is exactly
 * the status: how far the season has got.
 */
import { computed } from 'vue'
import { seqStep } from '~/utils/viz'

const props = defineProps({
  isCurrentSeason: { type: Boolean, default: true },
  round: { type: Number, required: true },
  maxRound: { type: Number, required: true },
  /** The round the calendar is actually on — the "Go to now" target. */
  liveRound: { type: Number, default: null },
  /** [{ round, total, completed }] for every round in the season. */
  rounds: { type: Array, default: () => [] },
  /** Fixtures in this season carrying no round number. */
  unrounded: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  completed: { type: Number, default: 0 },
  /** Paged by match day rather than by round — basketball, and cup football. */
  byDate: { type: Boolean, default: false },
})

defineEmits(['update:round'])

const unitName = computed(() => (props.byDate ? 'Day' : 'Round'))

const total = computed(() => props.total || props.rounds.reduce((s, r) => s + r.total, 0) + props.unrounded)
const completed = computed(() => props.completed)
const pctPlayed = computed(() => (total.value ? Math.round((completed.value / total.value) * 100) : 0))

/** Segments are legible while wide enough; basketball's date pages use a meter. */
const segments = computed(() => {
  if (props.byDate || props.rounds.length > 46) return []
  return props.rounds.map((r) => {
    const pct = r.total ? Math.round((r.completed / r.total) * 100) : 0
    return { ...r, pct, color: seqStep(pct / 100) }
  })
})

const phase = computed(() => {
  if (!total.value) return { label: 'No fixtures', dotClass: 'bg-zinc-600' }
  if (completed.value === 0) return { label: 'Not started', dotClass: 'bg-zinc-600' }
  if (completed.value === total.value) return { label: 'Complete', dotClass: 'bg-zinc-500' }
  const p = pctPlayed.value
  if (p < 15) return { label: 'Opening rounds', dotClass: 'bg-sky-400' }
  if (p < 85) return { label: 'In progress', dotClass: 'bg-emerald-400' }
  return { label: 'Run-in', dotClass: 'bg-amber-400' }
})

/** conic-gradient arc — degrees from percent, capped so 0% shows no sliver. */
const ringStyle = computed(() => {
  const deg = Math.max(0, Math.min(360, (pctPlayed.value / 100) * 360))
  return {
    background: `conic-gradient(#3987e5 ${deg}deg, rgba(255,255,255,0.07) ${deg}deg)`,
  }
})
</script>

<style scoped>
.seasonbody {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 0.85rem;
}

/* Progress ring — conic-gradient arc, masked to a ring, with the percentage
   set inside the hole. Transitions its own gradient stop on data change. */
.ring {
  position: relative;
  flex-shrink: 0;
  width: 4.6rem;
  height: 4.6rem;
  border-radius: 999px;
  transition: background 600ms cubic-bezier(0.22, 1, 0.36, 1);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.04);
}
.ring-hole {
  position: absolute;
  inset: 0.4rem;
  border-radius: 999px;
  background: #1b1e25;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
}
.ring-pct {
  font-size: 1.15rem;
  font-weight: 800;
  color: rgb(238, 239, 242);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.ring-pct-sym { font-size: 0.7rem; font-weight: 700; color: rgb(140, 143, 152); margin-left: 1px; }

/* Phase — the season's state, one line. */
.phase {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}
.phase-dot-wrap {
  position: relative;
  width: 0.4rem;
  height: 0.4rem;
  flex-shrink: 0;
  display: inline-flex;
}
.phase-dot { width: 0.4rem; height: 0.4rem; border-radius: 999px; display: inline-block; }
.phase-dot-ping {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  animation: dot-ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
  opacity: 0.6;
}
.phase-label {
  font-weight: 700;
  color: rgb(224, 225, 229);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.82rem;
  letter-spacing: 0.01em;
}

.played-line {
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
  margin-top: 0.35rem;
  font-variant-numeric: tabular-nums;
}
.stat-num { font-weight: 700; font-size: 1.3rem; color: rgb(236, 237, 240); letter-spacing: -0.01em; }
.stat-mut { color: rgb(108, 110, 118); font-size: 0.76rem; font-weight: 500; }
.stat-amber { color: rgba(252, 211, 77, 0.85); font-size: 0.6rem; }

.chip {
  padding: 0.16rem 0.45rem;
  border-radius: 999px;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  flex-shrink: 0;
}
.chip-archive { background: rgba(250, 178, 25, 0.12); color: #fac95e; }
.chip-live {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: rgba(57, 135, 229, 0.14);
  color: #8fbdf5;
  border: 1px solid rgba(57, 135, 229, 0.28);
  letter-spacing: 0.02em;
  transition: background 180ms ease, border-color 180ms ease, transform 140ms ease;
}
.chip-live:hover { background: rgba(57, 135, 229, 0.26); border-color: rgba(57, 135, 229, 0.5); transform: translateY(-1px); }
.chip-live:active { transform: translateY(0); }
.chip-live-dot {
  width: 0.3rem;
  height: 0.3rem;
  border-radius: 999px;
  background: #3987e5;
  box-shadow: 0 0 6px 1px rgba(57, 135, 229, 0.8);
}

.foot-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.4rem;
}

/* Progress rail — one segment per round, filled by completion. */
.rail {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  gap: 2px;
}
.rail-seg {
  position: relative;
  height: 0.5rem;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
  transition: height 180ms cubic-bezier(0.22, 1, 0.36, 1), background 140ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.rail-seg:hover { background: rgba(255, 255, 255, 0.1); transform: translateY(-1.5px) scaleY(1.15); }
.rail-seg-on {
  height: 0.65rem;
  margin-top: -0.075rem;
  box-shadow: 0 0 0 1px rgba(57, 135, 229, 0.75), 0 0 16px -2px rgba(57, 135, 229, 0.65);
}
.rail-fill {
  position: absolute;
  inset: 0 auto 0 0;
  display: block;
  border-radius: 2px 0 0 2px;
  transition: width 500ms cubic-bezier(0.22, 1, 0.36, 1);
}
.meter {
  height: 0.5rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}
.meter-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #184f95, #3987e5);
  transition: width 500ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes dot-ping {
  0% { transform: scale(1); opacity: 0.6; }
  75%, 100% { transform: scale(2.2); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .rail-fill, .meter-fill, .rail-seg, .chip-live, .ring { transition: none; }
  .phase-dot-ping { animation: none; display: none; }
}
</style>
