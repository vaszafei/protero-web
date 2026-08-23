<template>
  <div class="odds-ladder">
    <!-- 1X2 moneyline -->
    <div v-if="moneyline" class="ladder-block">
      <div class="ladder-label">1X2</div>
      <div class="grid grid-cols-3 gap-1">
        <div class="ladder-cell">
          <span class="ladder-cell-label">Home</span>
          <span class="ladder-cell-value tabular-nums">{{ fmt(moneyline.home) }}</span>
        </div>
        <div class="ladder-cell">
          <span class="ladder-cell-label">Draw</span>
          <span class="ladder-cell-value tabular-nums">{{ fmt(moneyline.draw) }}</span>
        </div>
        <div class="ladder-cell">
          <span class="ladder-cell-label">Away</span>
          <span class="ladder-cell-value tabular-nums">{{ fmt(moneyline.away) }}</span>
        </div>
      </div>
    </div>

    <!-- Double chance -->
    <div v-if="dc" class="ladder-block">
      <div class="ladder-label">Double Chance</div>
      <div class="grid grid-cols-3 gap-1">
        <div class="ladder-cell">
          <span class="ladder-cell-label">1X</span>
          <span class="ladder-cell-value tabular-nums">{{ fmt(dc.dc_1x) }}</span>
        </div>
        <div class="ladder-cell">
          <span class="ladder-cell-label">12</span>
          <span class="ladder-cell-value tabular-nums">{{ fmt(dc.dc_12) }}</span>
        </div>
        <div class="ladder-cell">
          <span class="ladder-cell-label">X2</span>
          <span class="ladder-cell-value tabular-nums">{{ fmt(dc.dc_x2) }}</span>
        </div>
      </div>
    </div>

    <!-- BTTS -->
    <div v-if="btts" class="ladder-block">
      <div class="ladder-label">Both Teams to Score</div>
      <div class="grid grid-cols-2 gap-1">
        <div class="ladder-cell">
          <span class="ladder-cell-label">Yes</span>
          <span class="ladder-cell-value tabular-nums">{{ fmt(btts.yes) }}</span>
        </div>
        <div class="ladder-cell">
          <span class="ladder-cell-label">No</span>
          <span class="ladder-cell-value tabular-nums">{{ fmt(btts.no) }}</span>
        </div>
      </div>
    </div>

    <!-- Over/Under ladder -->
    <div class="ladder-block">
      <div class="flex items-baseline justify-between">
        <div class="ladder-label">Total Goals (Over / Under)</div>
        <span v-if="lines.length" class="text-[9px] text-zinc-600">median across books</span>
      </div>

      <div v-if="lines.length" class="ladder-grid">
        <div
          v-for="row in lines"
          :key="row.line"
          class="ladder-row"
          :class="{ 'ladder-row-key': row.isKey }"
        >
          <span class="ladder-line-label tabular-nums">{{ row.line }}</span>
          <span class="ladder-side ladder-side-over">
            <span class="ladder-side-val tabular-nums">{{ fmt(row.over) }}</span>
            <span class="ladder-side-tag">Over</span>
          </span>
          <span class="ladder-side ladder-side-under">
            <span class="ladder-side-val tabular-nums">{{ fmt(row.under) }}</span>
            <span class="ladder-side-tag">Under</span>
          </span>
        </div>
      </div>
      <p v-else class="ladder-empty">No total-goals ladder stored for this fixture.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  oddsRaw: Record<string, any> | null
}>()

interface LadderRow { line: number; over: number | null; under: number | null }

function median(ns: (number | null)[]): number | null {
  const vals = ns.filter((n): n is number => n != null && isFinite(n))
  if (!vals.length) return null
  const sorted = [...vals].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function pick(rows: any[], ...keys: string[]): Record<string, any> | null {
  if (!Array.isArray(rows) || !rows.length) return null
  const row = rows[0]
  const out: Record<string, any> = {}
  for (const k of keys) {
    out[k] = median(rows.map(r => (r && r[k] != null ? Number(r[k]) : null)))
  }
  return out
}

const raw = computed(() => props.oddsRaw || null)

const moneyline = computed(() => {
  if (!raw.value) return null
  // Prefer the named 1x2 array; fall back to scalar odds_home/draw/away.
  if (Array.isArray(raw.value['1x2']) && raw.value['1x2'].length) {
    return pick(raw.value['1x2'], 'home', 'draw', 'away')
  }
  const h = Number(raw.value.odds_home)
  const d = Number(raw.value.odds_draw)
  const a = Number(raw.value.odds_away)
  if (isFinite(h) || isFinite(d) || isFinite(a)) {
    return {
      home: isFinite(h) ? h : null,
      draw: isFinite(d) ? d : null,
      away: isFinite(a) ? a : null,
    }
  }
  return null
})

const dc = computed(() => {
  if (!raw.value || !Array.isArray(raw.value.dc)) return null
  return pick(raw.value.dc, 'dc_1x', 'dc_12', 'dc_x2')
})

const btts = computed(() => {
  if (!raw.value || !Array.isArray(raw.value.btts)) return null
  return pick(raw.value.btts, 'yes', 'no')
})

const lines = computed<LadderRow[]>(() => {
  const ladder = raw.value?.ou_ladder
  if (!Array.isArray(ladder) || !ladder.length) return []

  const byLine = new Map<number, any[]>()
  for (const row of ladder) {
    const line = Number(row?.line)
    if (!isFinite(line)) continue
    if (!byLine.has(line)) byLine.set(line, [])
    byLine.get(line)!.push(row)
  }

  return [...byLine.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([line, rows]) => ({
      line,
      over: median(rows.map(r => (r?.over != null ? Number(r.over) : null))),
      under: median(rows.map(r => (r?.under != null ? Number(r.under) : null))),
      isKey: line === 2.5,
    }))
})

function fmt(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return '-'
  return Number(v).toFixed(2)
}
</script>

<style scoped>
.odds-ladder {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ladder-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ladder-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgb(113, 113, 122);
}

.ladder-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  padding: 0.5rem 0.25rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(42, 47, 58, 0.5);
}

.ladder-cell-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  color: rgb(113, 113, 122);
}

.ladder-cell-value {
  font-size: 1rem;
  font-weight: 700;
  color: rgb(228, 228, 231);
}

.ladder-grid {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.ladder-row {
  display: grid;
  grid-template-columns: 3rem 1fr 1fr;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid transparent;
}

.ladder-row-key {
  border-color: rgba(57, 135, 229, 0.35);
  background: rgba(57, 135, 229, 0.06);
}

.ladder-line-label {
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgb(212, 212, 216);
  text-align: center;
}

.ladder-side {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.ladder-side-over { justify-content: flex-end; }
.ladder-side-under { justify-content: flex-start; }

.ladder-side-val {
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgb(228, 228, 231);
}

.ladder-side-tag {
  font-size: 0.5625rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgb(113, 113, 122);
}

.ladder-empty {
  padding: 1rem 0;
  text-align: center;
  font-size: 0.75rem;
  color: rgb(113, 113, 122);
}
</style>
