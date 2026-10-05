<template>
  <section class="panel overflow-hidden" data-testid="football-pitch-panel" :data-state="hasLineup ? 'lineup' : 'empty'">
    <header class="panel-head">
      <span class="panel-title">Lineups</span>
      <span class="pill pill-blue">{{ game.home_formation || '—' }}</span>
      <span class="pill pill-dim ml-auto">{{ game.away_formation || '—' }}</span>
    </header>

    <div class="pp-body">
      <FormationPitch
        :home-lineup="lineups.home"
        :away-lineup="lineups.away"
        :home-name="game.home_name"
        :away-name="game.away_name"
        :home-formation="game.home_formation"
        :away-formation="game.away_formation"
      >
        <!-- No XI for a side: the frame stays, the score and what happened sit on it. -->
        <template v-if="!hasLineup">
          <div class="ov-score tabular-nums">{{ game.home_goals }} <i>-</i> {{ game.away_goals }}</div>
          <div class="ov-half ov-home"><span v-for="(e, i) in scorers.home" :key="i">{{ e }}</span></div>
          <div class="ov-half ov-away"><span v-for="(e, i) in scorers.away" :key="i">{{ e }}</span></div>
        </template>
      </FormationPitch>

      <!-- A fixed-height strip, so the panel is the same size whichever state it is in. -->
      <div class="pp-strip" data-testid="pitch-strip">
        <ul v-if="missing.length" class="missing" data-testid="pitch-missing">
          <li v-for="m in missing" :key="m">{{ m }}</li>
        </ul>
        <template v-if="hasLineup && (homeBench.length || awayBench.length)">
          <div class="bench">
            <div class="bench-side">
              <span class="bench-label">Bench · {{ game.home_name }}</span>
              <div class="bench-chips">
                <span v-for="pl in homeBench" :key="pl.id || pl.player_name" class="bench-chip" :style="{ borderColor: `${VIZ_HOME}55` }">
                  <span class="bench-chip-num">{{ pl.jersey_number || '-' }}</span>{{ benchName(pl.player_name) }}
                </span>
              </div>
            </div>
            <div class="bench-side">
              <span class="bench-label">Bench · {{ game.away_name }}</span>
              <div class="bench-chips">
                <span v-for="pl in awayBench" :key="pl.id || pl.player_name" class="bench-chip" :style="{ borderColor: `${VIZ_AWAY}55` }">
                  <span class="bench-chip-num">{{ pl.jersey_number || '-' }}</span>{{ benchName(pl.player_name) }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * The anchor of the centre column on a completed football game, in every state.
 *
 * A lineup exists for about a quarter of completed fixtures, so the pitch used to be absent on most
 * pages and the column collapsed to a note. The frame is now always here: with a lineup it carries
 * both XIs (rating, goals, assists, cards, minutes on each player) and the bench; without one it
 * carries the score and the scorers, and the strip below says exactly what is missing. The strip
 * is the same height in both, so there is no layout jump.
 */
import { computed } from 'vue'
import { VIZ_HOME, VIZ_AWAY } from '~/utils/viz'
import FormationPitch from '~/components/game/FormationPitch.vue'

const props = defineProps<{
  game: Record<string, any>
  lineups: { home: Array<Record<string, any>>; away: Array<Record<string, any>> }
}>()

const starter = (p: Record<string, any>) => (typeof p.is_starting_xi === 'boolean' ? p.is_starting_xi : true)
const startersOf = (side: 'home' | 'away') => (props.lineups?.[side] || []).filter(starter)

const hasLineup = computed(() => startersOf('home').length > 0 && startersOf('away').length > 0)

const homeBench = computed(() => (props.lineups?.home || []).filter((p) => !starter(p)))
const awayBench = computed(() => (props.lineups?.away || []).filter((p) => !starter(p)))

function benchName(name: string): string {
  if (!name) return ''
  const last = name.split(' ').pop() || name
  return last.length > 14 ? last.slice(0, 14) + '…' : last
}

const GOAL_TYPES = new Set(['goal', 'penalty_goal', 'own-goal', 'own_goal'])

/** "11' Burgess C." per side, from `match_events`; an own goal is credited to the side it counted for. */
const scorers = computed(() => {
  const out = { home: [] as string[], away: [] as string[] }
  const events = Array.isArray(props.game.match_events) ? props.game.match_events : []
  for (const e of events) {
    if (!GOAL_TYPES.has(String(e?.type))) continue
    const own = String(e.type).startsWith('own')
    const side = (e.isHome ? !own : own) ? 'home' : 'away'
    const label = `${e.time ?? (e.minute != null ? `${e.minute}'` : '')} ${e.player ?? ''}${own ? ' (og)' : ''}`.trim()
    out[side].push(label)
  }
  return { home: out.home.slice(0, 6), away: out.away.slice(0, 6) }
})

const hasEvents = computed(() => Array.isArray(props.game.match_events) && props.game.match_events.length > 0)

/** Every line is a fact about this fixture, not a general apology. */
const missing = computed(() => {
  const out: string[] = []
  const h = startersOf('home').length
  const a = startersOf('away').length
  if (!h && !a) out.push('No lineup recorded for this fixture.')
  else if (!h || !a) out.push(`No lineup recorded for ${!h ? props.game.home_name : props.game.away_name}.`)
  else {
    if (h !== 11 || a !== 11) out.push(`Starters recorded: ${props.game.home_name} ${h}, ${props.game.away_name} ${a}.`)
    if (!props.game.home_formation || !props.game.away_formation) {
      out.push('Formation not recorded: the outfield is in shirt-number order, not by role.')
    }
  }
  if (!hasEvents.value) out.push('Match events not recorded: no goals, cards or substitutions to place.')
  return out
})
</script>

<style scoped>
.pp-body { padding: 0.65rem; }
/* Two bench rows plus two notes, or three notes: fixed, so both states are the same size. */
.pp-strip { height: 112px; overflow-y: auto; padding-top: 0.55rem; }

.missing {
  list-style: none; margin: 0; padding: 0;
  font-size: 0.68rem; line-height: 1.5; color: var(--ink-mute);
}
.missing + .bench { margin-top: 0.5rem; }

.ov-score {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  font-size: 1.35rem; font-weight: 800; color: rgb(244, 244, 245);
  padding: 0.1rem 0.6rem; border-radius: 999px;
  background: rgba(20, 22, 27, 0.72);
}
.ov-score i { font-style: normal; color: rgb(161, 161, 170); margin: 0 0.15rem; }
.ov-half {
  position: absolute; top: 14px; bottom: 14px; width: 40%;
  display: flex; flex-direction: column; justify-content: center; gap: 0.2rem;
  font-size: 0.66rem; font-weight: 600; color: rgb(212, 212, 216);
}
.ov-home { left: 7%; align-items: flex-start; }
.ov-away { right: 7%; align-items: flex-end; }

.bench { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.bench-side { min-width: 0; }
.bench-label {
  display: block; font-size: 0.625rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.04em; color: rgb(113, 113, 122); margin-bottom: 0.4rem;
}
.bench-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.bench-chip {
  display: inline-flex; align-items: center; gap: 0.3rem;
  padding: 0.2rem 0.5rem 0.2rem 0.3rem;
  border-radius: 999px; border: 1px solid;
  background: rgba(255, 255, 255, 0.03);
  font-size: 0.65rem; font-weight: 600; color: rgb(212, 212, 216); white-space: nowrap;
}
.bench-chip-num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 1.1rem; height: 1.1rem; border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  font-size: 0.55rem; font-variant-numeric: tabular-nums; color: rgb(161, 161, 170);
}
</style>
