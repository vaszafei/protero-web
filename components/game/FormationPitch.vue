<template>
  <div class="pitch-h">
    <!-- pitch markings -->
    <div class="markings">
      <div class="pitch-border" />
      <div class="pitch-halfline" />
      <div class="pitch-centre" />
      <div class="pitch-box pitch-box-left" />
      <div class="pitch-box pitch-box-right" />
      <div class="pitch-six pitch-six-left" />
      <div class="pitch-six pitch-six-right" />
      <div class="pitch-spot pitch-spot-left" />
      <div class="pitch-spot pitch-spot-right" />
    </div>

    <!-- home (left half, attacking right) -->
    <div class="half half-home">
      <div class="team-label">
        <span class="team-label-name">{{ homeName }}</span>
        <span v-if="homeFormation" class="team-label-form">{{ homeFormation }}</span>
      </div>
      <div class="lines">
        <div v-for="(row, r) in homeRows" :key="'h'+r" class="line">
          <div
            v-for="(p, i) in row"
            :key="p.id || 'h'+r+'-'+i"
            class="player"
            :class="isGK(p) ? 'player-gk' : ''"
            :style="{ animationDelay: `${(r * 4 + i) * 35}ms` }"
          >
            <div class="player-dot" :style="{ borderColor: VIZ_HOME }">
              {{ p.jersey_number || '-' }}
            </div>
            <span class="player-name">{{ shortName(p.player_name) }}</span>
            <span v-if="rating(p)" class="player-rating">{{ rating(p) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- away (right half, attacking left) -->
    <div class="half half-away">
      <div class="team-label">
        <span class="team-label-name">{{ awayName }}</span>
        <span v-if="awayFormation" class="team-label-form">{{ awayFormation }}</span>
      </div>
      <div class="lines">
        <div v-for="(row, r) in awayDisplayRows" :key="'a'+r" class="line">
          <div
            v-for="(p, i) in row"
            :key="p.id || 'a'+r+'-'+i"
            class="player"
            :class="isGK(p) ? 'player-gk' : ''"
            :style="{ animationDelay: `${(r * 4 + i) * 35}ms` }"
          >
            <div class="player-dot" :style="{ borderColor: VIZ_AWAY }">
              {{ p.jersey_number || '-' }}
            </div>
            <span class="player-name">{{ shortName(p.player_name) }}</span>
            <span v-if="rating(p)" class="player-rating">{{ rating(p) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VIZ_HOME, VIZ_AWAY } from '~/utils/viz'

const props = defineProps<{
  homeLineup: Array<Record<string, any>>
  awayLineup: Array<Record<string, any>>
  homeName: string
  awayName: string
  homeFormation?: string | null
  awayFormation?: string | null
}>()

const isGK = (p: Record<string, any>) =>
  ['G', 'GK', 'Goalkeeper'].includes(String(p.position || '').trim())

const isStarter = (p: Record<string, any>) =>
  typeof p.is_starting_xi === 'boolean' ? p.is_starting_xi : true

const rating = (p: Record<string, any>) => {
  const r = parseFloat(p.rating)
  return isNaN(r) ? null : r.toFixed(1)
}

const shortName = (name: string) => {
  if (!name) return ''
  const parts = name.split(' ')
  // "Mikautadze G." → keep surname (last token without trailing dot)
  const last = parts[parts.length - 1]
  if (last.endsWith('.')) return last
  return last.length > 12 ? last.slice(0, 12) + '…' : last
}

// "4-4-2" → [4,4,2]; fallback [4,4,2] when missing/unparseable.
function parseFormation(f?: string | null): number[] {
  const parts = String(f || '')
    .split('-')
    .map((n) => parseInt(n, 10))
    .filter((n) => !isNaN(n) && n > 0)
  return parts.length ? parts : [4, 4, 2]
}

// Split a team's starters into pitch rows: GK row first, then the formation lines.
function buildRows(lineup: Array<Record<string, any>>, formation: string | null | undefined) {
  const starters = (lineup || [])
    .filter(isStarter)
    .slice()
    .sort((a, b) => (a.jersey_number || 99) - (b.jersey_number || 99))
  const gk = starters.filter(isGK)
  const field = starters.filter((p) => !isGK(p))
  const lines = parseFormation(formation)
  const rows: Array<Array<Record<string, any>>> = [gk.slice(0, 1)]
  let idx = 0
  for (const n of lines) {
    rows.push(field.slice(idx, idx + n))
    idx += n
  }
  if (idx < field.length) rows.push(field.slice(idx))
  return rows
}

const homeRows = computed(() => buildRows(props.homeLineup, props.homeFormation))
const awayRows = computed(() => buildRows(props.awayLineup, props.awayFormation))

// Away attacks left, so its goalkeeper sits at the RIGHT edge: reverse the
// built rows ([GK, DEF, MID, FWD] → [FWD, MID, DEF, GK]).
const awayDisplayRows = computed(() => [...awayRows.value].reverse())
</script>

<style scoped>
.pitch-h {
  position: relative;
  display: flex;
  align-items: stretch;
  min-height: 280px;
  border-radius: 0.5rem;
  background:
    radial-gradient(ellipse at 50% 50%, rgba(46, 125, 50, 0.28), rgba(24, 60, 32, 0.22)),
    repeating-linear-gradient(0deg, rgba(34, 139, 62, 0.10) 0 1px, transparent 1px 42px),
    repeating-linear-gradient(90deg, rgba(34, 139, 62, 0.10) 0 1px, transparent 1px 42px),
    #14261a;
  overflow: hidden;
  animation: pitch-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* pitch markings — horizontal pitch: goals left and right */
.markings {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.pitch-border {
  position: absolute;
  inset: 10px;
  border: 1px solid rgba(180, 220, 190, 0.28);
  border-radius: 0.25rem;
}
.pitch-halfline {
  position: absolute;
  left: 50%;
  top: 10px;
  bottom: 10px;
  width: 1px;
  background: rgba(180, 220, 190, 0.28);
}
.pitch-centre {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 56px;
  height: 56px;
  border: 1px solid rgba(180, 220, 190, 0.28);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.pitch-box {
  position: absolute;
  top: 50%;
  height: 60%;
  width: 16%;
  border: 1px solid rgba(180, 220, 190, 0.28);
  transform: translateY(-50%);
}
.pitch-box-left { left: 10px; border-left: none; }
.pitch-box-right { right: 10px; border-right: none; }
.pitch-six {
  position: absolute;
  top: 50%;
  height: 28%;
  width: 8%;
  border: 1px solid rgba(180, 220, 190, 0.28);
  transform: translateY(-50%);
}
.pitch-six-left { left: 10px; border-left: none; }
.pitch-six-right { right: 10px; border-right: none; }
.pitch-spot {
  position: absolute;
  top: 50%;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(180, 220, 190, 0.4);
  transform: translateY(-50%);
}
.pitch-spot-left { left: 17%; }
.pitch-spot-right { right: 17%; }

/* team halves */
.half {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.75rem 0.25rem;
}

.lines {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.line {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.team-label {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.4rem;
}
.team-label-name {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgb(212, 212, 216);
}
.team-label-form {
  font-size: 0.6rem;
  font-weight: 600;
  color: rgb(161, 161, 170);
}

/* player token */
.player {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  width: 32px;
  animation: player-rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.player-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(28, 31, 39, 0.85);
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  color: rgb(244, 244, 245);
  font-variant-numeric: tabular-nums;
}
.player-name {
  font-size: 0.5rem;
  font-weight: 600;
  color: rgb(212, 212, 216);
  max-width: 32px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.1;
}
.player-rating {
  font-size: 0.5rem;
  font-weight: 700;
  color: rgb(161, 161, 170);
  line-height: 1;
}
.player-gk .player-dot {
  border-style: dashed;
}

@keyframes pitch-in {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes player-rise {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .pitch-h, .player {
    animation: none;
  }
}
</style>
