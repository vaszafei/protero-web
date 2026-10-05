<template>
  <section class="panel overflow-hidden" data-testid="expected-five-panel">
    <header class="panel-head">
      <span class="panel-title">Expected five</span>
      <span
        class="pill pill-amber"
        title="A projection from each club's most recent game. Not an official lineup."
        data-testid="five-state"
      >Expected</span>
    </header>

    <div class="xf-body">
      <UiErrorState v-if="expected?.error" compact title="The expected five failed to load." :error="expected.error" @retry="$emit('retry')" />
      <template v-else>
        <div class="xf-cols">
          <div v-for="s in sides" :key="s" class="xf-col" :data-testid="`five-${s}`">
            <div class="xf-team">
              <span class="xf-name">{{ game[`${s}_name`] }}</span>
              <span
                v-if="side(s)?.status === 'ok'"
                class="pill pill-dim"
                :title="side(s).basis === 'starters'
                  ? 'The starting five the feed named in the club\'s last game.'
                  : 'This league\'s feed names no starters: the five with the most minutes in the club\'s last game.'"
              >{{ side(s).basis === 'starters' ? 'Starters' : 'Most minutes' }}</span>
            </div>
            <ul v-if="side(s)?.status === 'ok'" class="xf-list">
              <li v-for="p in side(s).players" :key="p.player_name" class="xf-row" data-testid="five-player">
                <span class="xf-player">{{ p.player_name }}</span>
                <span class="xf-tag" :title="hover(p, side(s).basis)">{{ tag(p, side(s).basis) }}</span>
              </li>
            </ul>
            <p v-else class="xf-empty">No lineup history for {{ game[`${s}_name`] }} this season: nothing to project.</p>
          </div>
        </div>

        <!-- A fixed-height strip, so the panel is the same size whichever state it is in. -->
        <ul class="xf-strip" data-testid="five-strip">
          <li v-for="n in notes" :key="n">{{ n }}</li>
        </ul>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * The centre column of a scheduled basketball game: each club's most recent starting five this season
 * (`game-page` → `expectedFive`), labelled as a projection, never as an official lineup. A club with no
 * game on record keeps its column empty and says so instead of guessing. A display of stored history:
 * it feeds no pick and no price.
 */
import { computed } from 'vue'
import UiErrorState from '~/components/ui/ErrorState.vue'

type Side = 'home' | 'away'

const props = defineProps<{
  game: Record<string, any>
  expected: { data: Record<string, any> | null; error: string | null } | null
}>()
defineEmits<{ (e: 'retry'): void }>()

const sides: Side[] = ['home', 'away']
const side = (s: Side) => props.expected?.data?.[s]

/** Under each name: games started (or played, on a minutes basis) in the window, and mean minutes. */
const tag = (p: Record<string, any>, basis: string) => {
  const n = basis === 'starters' ? p.form.starts : p.form.appearances
  const min = p.avg_minutes != null ? ` · ${Math.round(p.avg_minutes)} min` : ''
  return `${n}/${p.form.of}${min}`
}
const hover = (p: Record<string, any>, basis: string) =>
  `${p.player_name}: ${basis === 'starters' ? `started ${p.form.starts}` : `played ${p.form.appearances}`} of the club's last ${p.form.of} games with a box score`
  + `${p.avg_minutes != null ? `, ${p.avg_minutes.toFixed(1)} minutes a game` : ''}`

const dayOf = (iso: string) => iso.slice(0, 10)

/** Every line is a fact about this fixture, not a general apology. */
const notes = computed(() => {
  const out: string[] = []
  for (const s of sides) {
    const x = side(s)
    if (x?.status === 'ok') out.push(`${props.game[`${s}_name`]}: five from ${dayOf(x.source.date)}.`)
  }
  out.push('Right of each name: games in the club\'s last box scores, and average minutes.')
  if (props.expected?.data?.availability === 'no_feed') out.push('No injury feed: absences are not reflected.')
  return out
})
</script>

<style scoped>
.xf-body { padding: 0.65rem; }
.xf-cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
.xf-team { display: flex; align-items: center; gap: 0.4rem; min-height: 1.5rem; margin-bottom: 0.3rem; }
.xf-name { font-size: 0.75rem; font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.xf-list { margin: 0; padding: 0; list-style: none; }
.xf-row { display: flex; justify-content: space-between; gap: 0.5rem; padding: 0.3rem 0; border-top: 1px solid var(--edge, #2a2f3a); font-size: 0.72rem; }
.xf-player { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.xf-tag { flex-shrink: 0; color: var(--ink-mute); font-variant-numeric: tabular-nums; }
.xf-empty { margin: 0; padding: 0.5rem 0; font-size: 0.7rem; color: var(--ink-mute); }
/* Four short notes: fixed, so a club with history and a club without are the same size. */
.xf-strip {
  height: 84px; overflow-y: auto; margin: 0; padding: 0.55rem 0 0; list-style: none;
  font-size: 0.68rem; line-height: 1.5; color: var(--ink-mute);
}
</style>
