<template>
  <div class="mt-h" ref="wrapRef">
    <div class="mt-scroll">
      <div class="mt-plot" ref="plotRef" :style="{ '--lanes-home': laneCount.home, '--lanes-away': laneCount.away }">
        <!-- home markers (above the axis) -->
        <button
          v-for="m in placed.home"
          :key="'h' + m.key"
          type="button"
          class="mt-marker mt-marker-home"
          :class="[m.big ? 'is-big' : '', 'tone-' + m.tone]"
          :style="{ left: m.x + 'px', '--lane': m.lane, '--i': m.order }"
          :aria-label="`${m.minuteLabel} ${m.player} ${m.label}`"
        >
          <span class="mt-stem" />
          <span class="mt-dot"><UIcon :name="m.icon" class="mt-icon" /></span>
          <span v-if="m.big" class="mt-inline-label">{{ m.short }}</span>
          <span class="mt-tip">
            <b>{{ m.minuteLabel }}</b> · {{ m.player }}<span v-if="m.score" class="mt-tip-score">{{ m.score }}</span>
            <em>{{ m.label }}</em>
          </span>
        </button>

        <!-- half-time divider, drawn through the full height of the plot -->
        <span v-if="htX !== null" class="mt-half" :style="{ left: htX + 'px' }"><label>HT</label></span>

        <!-- the axis -->
        <div class="mt-axis">
          <span class="mt-axis-line" />
          <span v-for="t in ticks" :key="t.at" class="mt-tick" :style="{ left: t.x + 'px' }">
            <i />
            <label>{{ t.at }}'</label>
          </span>
        </div>

        <!-- away markers (below the axis) -->
        <button
          v-for="m in placed.away"
          :key="'a' + m.key"
          type="button"
          class="mt-marker mt-marker-away"
          :class="[m.big ? 'is-big' : '', 'tone-' + m.tone]"
          :style="{ left: m.x + 'px', '--lane': m.lane, '--i': m.order }"
          :aria-label="`${m.minuteLabel} ${m.player} ${m.label}`"
        >
          <span class="mt-stem" />
          <span class="mt-dot"><UIcon :name="m.icon" class="mt-icon" /></span>
          <span v-if="m.big" class="mt-inline-label">{{ m.short }}</span>
          <span class="mt-tip">
            <b>{{ m.minuteLabel }}</b> · {{ m.player }}<span v-if="m.score" class="mt-tip-score">{{ m.score }}</span>
            <em>{{ m.label }}</em>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { VIZ_HOME, VIZ_AWAY } from '~/utils/viz'

const props = defineProps({
  events: { type: Array, required: true },
  homeName: { type: String, required: true },
  awayName: { type: String, required: true },
  homeLineup: { type: Array, default: () => [] },
  awayLineup: { type: Array, default: () => [] },
})

/* ── team attribution ────────────────────────────────────────────────
   The feed's `isHome` is unreliable, so the lineups are the authority:
   a scorer named in the home XI is a home event regardless of the flag. */
const norm = (n) => (n || '').toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()
const homeNames = computed(() => props.homeLineup.map((p) => norm(p.player_name || p.name || '')).filter(Boolean))
const awayNames = computed(() => props.awayLineup.map((p) => norm(p.player_name || p.name || '')).filter(Boolean))

function sideOf(ev) {
  const p = norm(ev.player)
  if (p) {
    const inHome = homeNames.value.some((n) => n.includes(p) || p.includes(n))
    const inAway = awayNames.value.some((n) => n.includes(p) || p.includes(n))
    if (inHome && !inAway) return 'home'
    if (inAway && !inHome) return 'away'
  }
  if (ev.isHome === true || ev.isHome === 'true') return 'home'
  if (ev.isHome === false || ev.isHome === 'false') return 'away'
  return ev.team === 'away' ? 'away' : 'home'
}

/* minute parsing keeps stoppage time ("45+2") ordered after its base minute */
function minuteOf(ev) {
  const raw = ev.minute ?? ev.time
  if (typeof raw === 'number') return { base: raw, extra: 0 }
  const s = String(raw || '')
  const m = s.match(/(\d+)(?:\s*\+\s*(\d+))?/)
  if (!m) return { base: 0, extra: 0 }
  return { base: parseInt(m[1], 10) || 0, extra: parseInt(m[2], 10) || 0 }
}

const LABELS = {
  goal: 'Goal', penalty_goal: 'Penalty', 'penalty-goal': 'Penalty',
  own_goal: 'Own Goal', 'own-goal': 'Own Goal',
  yellow_card: 'Yellow Card', 'yellow-card': 'Yellow Card',
  red_card: 'Red Card', 'red-card': 'Red Card',
  substitution: 'Substitution', var: 'VAR',
  penalty_missed: 'Penalty Missed', 'penalty-missed': 'Penalty Missed',
}

function glyph(t) {
  if (t.includes('own')) return 'i-heroicons-arrow-uturn-left'
  if (t.includes('missed')) return 'i-heroicons-x-mark'
  if (t.includes('goal') || t.includes('penalty')) return 'i-heroicons-bolt-solid'
  if (t.includes('red')) return 'i-heroicons-stop-solid'
  if (t.includes('yellow')) return 'i-heroicons-square-2-stack-solid'
  if (t.includes('sub')) return 'i-heroicons-arrow-path'
  if (t.includes('var')) return 'i-heroicons-tv'
  return 'i-heroicons-minus'
}

function tone(t) {
  if (t.includes('own')) return 'own'
  if (t.includes('missed')) return 'miss'
  if (t.includes('goal') || t.includes('penalty')) return 'goal'
  if (t.includes('red')) return 'red'
  if (t.includes('yellow')) return 'yellow'
  return 'plain'
}

/** surname only — the marker label has ~90px to work with */
function short(name) {
  if (!name) return ''
  const parts = String(name).trim().split(/\s+/)
  const last = parts.length > 1 && parts[parts.length - 1].length <= 2
    ? parts[parts.length - 2]      // "Palhinha J." → "Palhinha"
    : parts[parts.length - 1]
  return last.length > 12 ? last.slice(0, 12) + '…' : last
}

/* normalised, ordered, with a running score attached to each goal */
const model = computed(() => {
  const rows = props.events.map((ev, i) => {
    const t = String(ev.type || '').toLowerCase()
    const { base, extra } = minuteOf(ev)
    return {
      key: i, side: sideOf(ev), type: t, base, extra,
      at: base + extra / 100,
      minuteLabel: extra ? `${base}+${extra}'` : `${base}'`,
      player: ev.player || '—',
      short: short(ev.player),
      label: LABELS[t] || (t ? t.replace(/[_-]/g, ' ') : 'Event'),
      icon: glyph(t), tone: tone(t),
      big: tone(t) === 'goal' || tone(t) === 'own',
      score: '',
    }
  }).sort((a, b) => a.at - b.at)

  // running score — an own goal credits the opposing side
  let h = 0, a = 0
  for (const r of rows) {
    if (r.tone === 'goal') { r.side === 'home' ? h++ : a++ }
    else if (r.tone === 'own') { r.side === 'home' ? a++ : h++ }
    else continue
    r.score = ` (${h}–${a})`
  }
  rows.forEach((r, i) => { r.order = i })
  return rows
})

/* span always covers regulation; extends for extra time */
const maxMinute = computed(() => {
  const last = model.value.length ? Math.ceil(model.value[model.value.length - 1].at) : 90
  return Math.max(90, last <= 90 ? 90 : last <= 120 ? 120 : last)
})

const ticks = computed(() => {
  const out = []
  for (let m = 0; m <= maxMinute.value; m += 15) out.push({ at: m, x: xOf(m) })
  return out
})
const htX = computed(() => (maxMinute.value >= 45 ? xOf(45) : null))

/* ── geometry ────────────────────────────────────────────────────────
   Lane packing runs in px, so it needs a measured width. The plot keeps a
   min-width so a phone scrolls the axis instead of collapsing the markers. */
const wrapRef = ref(null)
const plotRef = ref(null)
const width = ref(900)
const PAD = 26            // keeps the 0' and 90' markers inside the box
const MIN_GAP = 30        // px below which two markers share a column

function xOf(minute) {
  const span = Math.max(1, maxMinute.value)
  return PAD + (Math.min(minute, span) / span) * Math.max(1, width.value - PAD * 2)
}

function pack(rows) {
  const lanes = []            // lanes[i] = x of the last marker placed in lane i
  return rows.map((r) => {
    const x = xOf(r.at)
    let lane = lanes.findIndex((lastX) => x - lastX >= MIN_GAP)
    if (lane === -1) { lane = lanes.length; lanes.push(x) } else { lanes[lane] = x }
    return { ...r, x, lane }
  })
}

const placed = computed(() => ({
  home: pack(model.value.filter((r) => r.side === 'home')),
  away: pack(model.value.filter((r) => r.side === 'away')),
}))

const laneCount = computed(() => ({
  home: Math.max(1, ...placed.value.home.map((m) => m.lane + 1), 1),
  away: Math.max(1, ...placed.value.away.map((m) => m.lane + 1), 1),
}))

let ro = null
function measure() {
  const el = plotRef.value
  if (el) width.value = el.clientWidth || 900
}
onMounted(() => {
  nextTick(measure)
  if (typeof ResizeObserver !== 'undefined' && plotRef.value) {
    ro = new ResizeObserver(measure)
    ro.observe(plotRef.value)
  }
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<style scoped>
.mt-h { position: relative; }

/* a narrow viewport scrolls the axis rather than stacking it into a column */
.mt-scroll { overflow-x: auto; overflow-y: hidden; }
.mt-plot {
  position: relative;
  min-width: 560px;
  /* GUTTER (18px) is the band under the axis that the minute labels own; the
     away markers start below it or they sit on top of "60'" / "75'". */
  height: calc((var(--lanes-home) + var(--lanes-away)) * 34px + 18px);
}

/* ── geometry ──────────────────────────────────────────────────────────
   One 34px slot per lane. Lane 0 sits nearest the axis on both sides, so a
   match with three simultaneous subs grows the panel by one row instead of
   overlapping markers. Plot height = (homeLanes + awayLanes) x 34. */
.mt-axis {
  position: absolute; left: 0; right: 0;
  top: calc(var(--lanes-home) * 34px);
  height: 0;
}
.mt-axis-line {
  position: absolute; left: 0; right: 0; top: -1px; height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, rgba(57,135,229,0.35), #343a47 55%, rgba(217,89,38,0.35));
  transform-origin: left center;
  animation: mt-draw 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.mt-tick { position: absolute; top: 0; transform: translateX(-50%); }
.mt-tick i {
  position: absolute; top: -4px; left: 50%; width: 1px; height: 8px;
  background: #343a47; transform: translateX(-50%);
}
.mt-tick label {
  position: absolute; top: 6px; left: 50%; transform: translateX(-50%);
  font-size: 0.55rem; font-variant-numeric: tabular-nums; color: #5b616e; white-space: nowrap;
}
.mt-half {
  position: absolute; top: 0; bottom: 0; width: 0;
  border-left: 1px dashed #2a2f3a;
  z-index: 0;
}
.mt-half label {
  position: absolute; top: -2px; left: 50%; transform: translateX(-50%);
  font-size: 0.5rem; font-weight: 700; letter-spacing: 0.06em; color: #6b7280;
  background: #1c1f27; padding: 0 3px; border-radius: 2px;
}

/* ── markers ── */
.mt-marker {
  position: absolute; transform: translateX(-50%);
  height: 34px; width: 96px;
  display: flex; flex-direction: column; align-items: center;
  background: none; border: 0; padding: 0; cursor: default;
  animation: mt-pop 0.36s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--i) * 28ms + 200ms);
}
/* lane 0 = the slot touching the axis */
.mt-marker-home {
  top: calc((var(--lanes-home) - 1 - var(--lane)) * 34px);
  justify-content: flex-end;
}
.mt-marker-away {
  top: calc(var(--lanes-home) * 34px + 18px + var(--lane) * 34px);
  justify-content: flex-start;
}

.mt-stem { width: 1px; height: 7px; background: #2a2f3a; flex: none; }
.mt-marker-home .mt-inline-label { order: 1; }
.mt-marker-home .mt-dot        { order: 2; }
.mt-marker-home .mt-stem       { order: 3; }
.mt-marker-away .mt-stem       { order: 1; }
.mt-marker-away .mt-dot        { order: 2; }
.mt-marker-away .mt-inline-label { order: 3; }

.mt-dot {
  width: 19px; height: 19px; border-radius: 50%; flex: none;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #14161b; color: #fff;
  box-shadow: 0 0 0 1px rgba(42,47,58,0.9), 0 2px 6px rgba(0,0,0,0.45);
  transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 160ms ease;
}
.mt-icon { width: 10px; height: 10px; }
.is-big .mt-dot { width: 23px; height: 23px; }
.is-big .mt-icon { width: 12px; height: 12px; }

.mt-marker-home .mt-dot { background: #3987e5; }
.mt-marker-away .mt-dot { background: #d95926; }
.tone-yellow .mt-dot { background: #f59e0b; }
.tone-red .mt-dot { background: #ef4444; }
.tone-own .mt-dot { background: #a855f7; }
.tone-miss .mt-dot { background: #52525b; }
.tone-goal .mt-dot {
  box-shadow: 0 0 0 1px rgba(42,47,58,0.9), 0 0 12px 1px rgba(255,255,255,0.18), 0 2px 6px rgba(0,0,0,0.45);
}

.mt-inline-label {
  font-size: 0.6rem; font-weight: 700; color: #e4e4e7; line-height: 1.1;
  max-width: 96px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  flex: none;
}

/* hover lifts the marker and reveals the full detail */
.mt-marker:hover, .mt-marker:focus-visible { z-index: 30; }
.mt-marker:hover .mt-dot { transform: scale(1.22); }

.mt-tip {
  position: absolute; z-index: 40; left: 50%;
  bottom: calc(100% - 4px);
  transform: translate(-50%, 4px);
  display: flex; flex-direction: column; gap: 1px;
  padding: 0.3rem 0.5rem; border-radius: 0.4rem;
  background: #232732; border: 1px solid #333a48;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  font-size: 0.65rem; color: #f4f4f5; white-space: nowrap;
  opacity: 0; pointer-events: none;
  transition: opacity 140ms ease, transform 140ms cubic-bezier(0.22, 1, 0.36, 1);
}
.mt-marker-away .mt-tip { bottom: auto; top: calc(100% - 4px); transform: translate(-50%, -4px); }
.mt-marker:hover .mt-tip, .mt-marker:focus-visible .mt-tip { opacity: 1; transform: translate(-50%, 0); }
.mt-tip em { font-style: normal; font-size: 0.575rem; text-transform: uppercase; letter-spacing: 0.04em; color: #a1a1aa; }
.mt-tip-score { color: #4ade80; font-weight: 700; font-variant-numeric: tabular-nums; }

@keyframes mt-draw { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes mt-pop {
  from { opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.7); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .mt-axis-line, .mt-marker { animation: none; }
  .mt-dot, .mt-tip { transition: none; }
}
</style>
